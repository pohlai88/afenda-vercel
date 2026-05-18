"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, count, eq, isNull } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmApplication,
  hrmCandidate,
  hrmInterview,
  hrmInterviewScorecard,
  hrmJobOffer,
  hrmJobPosting,
  hrmJobRequisition,
  hrmPreEmploymentCheck,
  hrmRecruitmentAssessment,
  hrmRecruitmentCommunication,
  hrmRecruitmentEvent,
} from "#lib/db/schema"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { ORG_APPS_HRM_RECRUITMENT } from "#lib/org-apps-module-paths"
import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { createEmployeeMutation } from "../../../employee-management/employee-records-management/data/employee.mutations.server"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../../../_internal-cross-cutting/hrm-org-fk.server"
import {
  canTransitionApplicationStage,
  canTransitionOfferStatus,
  canTransitionRequisitionStatus,
  canPublishRequisition,
  INTERVIEW_OUTCOME_TO_EVENT,
  parseRequiredSkillCodesInput,
  preEmploymentChecksReadyForHire,
} from "../data/recruitment-workflow.shared"
import {
  advanceApplicationStageFormSchema,
  cancelJobRequisitionFormSchema,
  convertAcceptedOfferFormSchema,
  createCandidateApplicationFormSchema,
  createJobOfferFormSchema,
  createJobRequisitionFormSchema,
  decideRequisitionApprovalFormSchema,
  evaluateScreeningFormSchema,
  publishJobRequisitionFormSchema,
  recordAssessmentResultFormSchema,
  recordPreEmploymentCheckFormSchema,
  recordRecruitmentCommunicationFormSchema,
  requestRequisitionApprovalFormSchema,
  scheduleInterviewFormSchema,
  submitInterviewScorecardFormSchema,
  submitInterviewFeedbackFormSchema,
  updateJobOfferStatusFormSchema,
  type HrmApplicationStage,
  type HrmJobOfferStatus,
  type HrmJobRequisitionStatus,
} from "../schemas/recruitment.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RecruitmentMutationFormState } from "../../../types"
import { HRM_RECRUITMENT_AUDIT } from "../recruitment.contract"

type RecruitmentFunction = "create" | "update"

type RecruitmentGate =
  | {
      ok: true
      orgSlug: string
      organizationId: string
      userId: string
      sessionId: string
    }
  | { ok: false; response: RecruitmentMutationFormState }

type RecruitmentEventInput = {
  organizationId: string
  subjectKind: string
  subjectId: string
  eventType: string
  actorUserId: string
  fromState?: string | null
  toState?: string | null
  metadata?: Record<string, unknown>
}

type RecruitmentDbClient = Pick<typeof db, "insert" | "update" | "select">

const RECRUITMENT_REQUISITION_APPROVAL_SUBJECT = "recruitment_requisition"
const RECRUITMENT_OFFER_APPROVAL_SUBJECT = "recruitment_offer"

function revalidateRecruitment() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_RECRUITMENT),
    "page"
  )
}

function uniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

function parseDateOnly(value: string | undefined | null): Date | null {
  if (!value) return null
  const ms = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(ms) ? new Date(ms) : null
}

function parseDateTime(value: string | undefined | null): Date | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? new Date(ms) : null
}

function normalizeNullable(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function assertApplicationStage(value: string): HrmApplicationStage {
  switch (value) {
    case "applied":
    case "screening":
    case "shortlisted":
    case "interview":
    case "assessment":
    case "offer":
    case "hired":
    case "rejected":
    case "withdrawn":
    case "archived":
      return value
    default:
      throw new Error(`Unexpected HRM application stage "${value}"`)
  }
}

function assertOfferStatus(value: string): HrmJobOfferStatus {
  switch (value) {
    case "draft":
    case "pending_approval":
    case "approved":
    case "sent":
    case "accepted":
    case "declined":
    case "withdrawn":
    case "expired":
      return value
    case "rejected":
      return "declined"
    default:
      throw new Error(`Unexpected HRM offer status "${value}"`)
  }
}

function assertRequisitionStatus(value: string): HrmJobRequisitionStatus {
  switch (value) {
    case "draft":
    case "pending_approval":
    case "approved":
    case "open":
    case "filled":
    case "cancelled":
      return value
    default:
      throw new Error(`Unexpected HRM requisition status "${value}"`)
  }
}

async function requireRecruitmentGate(
  formData: FormData,
  fn: RecruitmentFunction
): Promise<RecruitmentGate> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireHrmPermission({
    object: "recruitment",
    function: fn,
    errorMessage: `HRM recruitment ${fn} permission required.`,
  })
  if (!permission.ok) {
    return {
      ok: false,
      response: hrmActionFailure({ form: permission.error }),
    }
  }

  if (permission.session.organizationId !== tenant.session.organizationId) {
    return {
      ok: false,
      response: hrmActionFailure({ form: "Organization context changed." }),
    }
  }

  return {
    ok: true,
    orgSlug: tenant.orgSlug,
    organizationId: tenant.session.organizationId,
    userId: tenant.session.userId,
    sessionId: tenant.session.sessionId,
  }
}

async function recordRecruitmentEvent(
  client: RecruitmentDbClient,
  input: RecruitmentEventInput
): Promise<void> {
  await client.insert(hrmRecruitmentEvent).values({
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    eventType: input.eventType,
    fromState: input.fromState ?? null,
    toState: input.toState ?? null,
    actorUserId: input.actorUserId,
    metadata: input.metadata ?? {},
  })
}

function auditRecruitment(input: {
  action: string
  organizationId: string
  userId: string
  sessionId: string
  resourceType: string
  resourceId: string
  metadata?: Record<string, unknown>
}) {
  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: input.action,
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata ?? {},
    })
  )
}

export async function createJobRequisitionAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createJobRequisitionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    title: formData.get("title"),
    requisitionType: formData.get("requisitionType") ?? undefined,
    legalEntityId: formData.get("legalEntityId") ?? undefined,
    departmentId: formData.get("departmentId") ?? undefined,
    positionId: formData.get("positionId") ?? undefined,
    jobGradeId: formData.get("jobGradeId") ?? undefined,
    workLocationCode: formData.get("workLocationCode") ?? undefined,
    employmentType: formData.get("employmentType") ?? undefined,
    hiringManagerUserId: formData.get("hiringManagerUserId") ?? undefined,
    budgetReference: formData.get("budgetReference") ?? undefined,
    headcount: formData.get("headcount") ?? undefined,
    requiredSkillCodes: formData.get("requiredSkillCodes") ?? undefined,
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({ form: fe.title?.[0] ?? fe.orgSlug?.[0] })
  }

  const deptId = normalizeNullable(parsed.data.departmentId)
  const positionId = normalizeNullable(parsed.data.positionId)
  const jobGradeId = normalizeNullable(parsed.data.jobGradeId)
  if (deptId || positionId || jobGradeId) {
    const fk = await assertOptionalHrmPlacementFkBelongsToOrg(organizationId, {
      departmentId: deptId,
      positionId,
      gradeId: jobGradeId,
    })
    if (!fk.ok) return hrmActionFailure({ form: fk.message })
  }

  const skillRequirements = parseRequiredSkillCodesInput(
    parsed.data.requiredSkillCodes
  )
  const id = crypto.randomUUID()
  await db.insert(hrmJobRequisition).values({
    id,
    organizationId,
    title: parsed.data.title,
    requisitionType: parsed.data.requisitionType,
    legalEntityId: normalizeNullable(parsed.data.legalEntityId),
    departmentId: deptId,
    positionId,
    jobGradeId,
    workLocationCode: normalizeNullable(parsed.data.workLocationCode),
    employmentType: normalizeNullable(parsed.data.employmentType),
    hiringManagerUserId: normalizeNullable(parsed.data.hiringManagerUserId),
    budgetReference: normalizeNullable(parsed.data.budgetReference),
    headcount: parsed.data.headcount ?? 1,
    status: "draft",
    audit7w1h: skillRequirements.length > 0 ? { skillRequirements } : null,
    createdByUserId: userId,
    updatedByUserId: userId,
  })
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "requisition",
    subjectId: id,
    eventType: "requisition.created",
    actorUserId: userId,
    toState: "draft",
    metadata: {
      headcount: parsed.data.headcount ?? 1,
      requisitionType: parsed.data.requisitionType,
      skillRequirements,
    },
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.requisition.create,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_job_requisition",
    resourceId: id,
    metadata: {
      title: parsed.data.title,
      skillRequirements,
    },
  })

  revalidateRecruitment()
  return { ok: true, id }
}

export async function requestRequisitionApprovalAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = requestRequisitionApprovalFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    requisitionId: formData.get("requisitionId"),
    approverUserId: formData.get("approverUserId") ?? undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid requisition approval request." })
  }

  const [row] = await db
    .select({
      id: hrmJobRequisition.id,
      title: hrmJobRequisition.title,
      status: hrmJobRequisition.status,
      approvalState: hrmJobRequisition.approvalState,
    })
    .from(hrmJobRequisition)
    .where(
      and(
        eq(hrmJobRequisition.organizationId, organizationId),
        eq(hrmJobRequisition.id, parsed.data.requisitionId)
      )
    )
    .limit(1)
  if (!row) return hrmActionFailure({ form: "Requisition not found." })
  if (
    !canTransitionRequisitionStatus(
      assertRequisitionStatus(row.status),
      "pending_approval"
    )
  ) {
    return hrmActionFailure({
      form: "Only draft requisitions can be submitted for approval.",
    })
  }
  if (row.approvalState === "pending") {
    return hrmActionFailure({ form: "Approval is already pending." })
  }

  const approvalId = crypto.randomUUID()
  const approverUserId = normalizeNullable(parsed.data.approverUserId)
  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: RECRUITMENT_REQUISITION_APPROVAL_SUBJECT,
      subjectId: row.id,
      requestedByUserId: userId,
      currentApproverUserId: approverUserId,
      snapshot: { title: row.title, status: row.status },
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    await tx
      .update(hrmJobRequisition)
      .set({
        status: "pending_approval",
        approvalState: "pending",
        currentApprovalId: approvalId,
        approverUserId,
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(eq(hrmJobRequisition.id, row.id))
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "requisition",
      subjectId: row.id,
      eventType: "requisition.approval_requested",
      actorUserId: userId,
      fromState: row.approvalState,
      toState: "pending",
      metadata: { approvalId, approverUserId },
    })
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.requisition.submitApproval,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: { requisitionId: row.id },
  })
  revalidateRecruitment()
  return { ok: true, id: approvalId }
}

export async function decideRequisitionApprovalAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = decideRequisitionApprovalFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decisionNote") ?? undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid approval decision." })
  }

  const [approval] = await db
    .select({
      id: hrmApproval.id,
      subjectKind: hrmApproval.subjectKind,
      subjectId: hrmApproval.subjectId,
      state: hrmApproval.state,
    })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, organizationId),
        eq(hrmApproval.id, parsed.data.approvalId)
      )
    )
    .limit(1)
  if (
    !approval ||
    approval.subjectKind !== RECRUITMENT_REQUISITION_APPROVAL_SUBJECT
  ) {
    return hrmActionFailure({ form: "Requisition approval not found." })
  }
  if (approval.state !== "pending") {
    return hrmActionFailure({ form: "Approval is not pending." })
  }

  const now = new Date()
  const nextStatus: HrmJobRequisitionStatus =
    parsed.data.decision === "approved" ? "approved" : "cancelled"
  await db.transaction(async (tx) => {
    await tx
      .update(hrmApproval)
      .set({
        state: parsed.data.decision,
        decisionByUserId: userId,
        decisionAt: now,
        decisionNote: normalizeNullable(parsed.data.decisionNote),
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmApproval.id, approval.id))
    await tx
      .update(hrmJobRequisition)
      .set({
        status: nextStatus,
        approvalState: parsed.data.decision,
        updatedAt: now,
        updatedByUserId: userId,
      })
      .where(eq(hrmJobRequisition.id, approval.subjectId))
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "requisition",
      subjectId: approval.subjectId,
      eventType: `requisition.approval_${parsed.data.decision}`,
      actorUserId: userId,
      fromState: "pending",
      toState: parsed.data.decision,
      metadata: { approvalId: approval.id },
    })
  })

  auditRecruitment({
    action:
      parsed.data.decision === "approved"
        ? HRM_RECRUITMENT_AUDIT.requisition.approve
        : HRM_RECRUITMENT_AUDIT.requisition.reject,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_approval",
    resourceId: approval.id,
    metadata: { requisitionId: approval.subjectId },
  })
  revalidateRecruitment()
  return { ok: true, id: approval.subjectId }
}

export async function publishJobRequisitionAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = publishJobRequisitionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    requisitionId: formData.get("requisitionId"),
    channel: formData.get("channel") ?? undefined,
    externalReference: formData.get("externalReference") ?? undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid requisition." })
  }

  const [row] = await db
    .select({
      id: hrmJobRequisition.id,
      status: hrmJobRequisition.status,
      approvalState: hrmJobRequisition.approvalState,
    })
    .from(hrmJobRequisition)
    .where(
      and(
        eq(hrmJobRequisition.organizationId, organizationId),
        eq(hrmJobRequisition.id, parsed.data.requisitionId)
      )
    )
    .limit(1)
  if (!row) {
    return hrmActionFailure({ form: "Requisition not found." })
  }

  const from = assertRequisitionStatus(row.status)
  if (
    !canTransitionRequisitionStatus(from, "open") ||
    !canPublishRequisition({
      status: from,
      approvalState:
        row.approvalState === "pending" ||
        row.approvalState === "approved" ||
        row.approvalState === "rejected"
          ? row.approvalState
          : "not_required",
    })
  ) {
    return hrmActionFailure({
      form: "Requisition approval must be complete before posting.",
    })
  }

  const postingId = crypto.randomUUID()
  await db.transaction(async (tx) => {
    await tx
      .update(hrmJobRequisition)
      .set({ status: "open", updatedAt: new Date(), updatedByUserId: userId })
      .where(eq(hrmJobRequisition.id, row.id))
    await tx.insert(hrmJobPosting).values({
      id: postingId,
      organizationId,
      requisitionId: row.id,
      channel: parsed.data.channel,
      status: "published",
      externalReference: normalizeNullable(parsed.data.externalReference),
      publishedAt: new Date(),
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "requisition",
      subjectId: row.id,
      eventType: "requisition.published",
      actorUserId: userId,
      fromState: from,
      toState: "open",
      metadata: { postingId, channel: parsed.data.channel },
    })
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.requisition.publish,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_job_requisition",
    resourceId: row.id,
  })

  revalidateRecruitment()
  return { ok: true, id: row.id }
}

export async function cancelJobRequisitionAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = cancelJobRequisitionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    requisitionId: formData.get("requisitionId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid requisition." })
  }

  const [row] = await db
    .select({ id: hrmJobRequisition.id, status: hrmJobRequisition.status })
    .from(hrmJobRequisition)
    .where(
      and(
        eq(hrmJobRequisition.organizationId, organizationId),
        eq(hrmJobRequisition.id, parsed.data.requisitionId)
      )
    )
    .limit(1)
  if (!row) {
    return hrmActionFailure({ form: "Requisition not found." })
  }
  const from = assertRequisitionStatus(row.status)
  if (!canTransitionRequisitionStatus(from, "cancelled")) {
    return hrmActionFailure({ form: "This requisition cannot be cancelled." })
  }

  await db
    .update(hrmJobRequisition)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(eq(hrmJobRequisition.id, row.id))
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "requisition",
    subjectId: row.id,
    eventType: "requisition.cancelled",
    actorUserId: userId,
    fromState: from,
    toState: "cancelled",
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.requisition.cancel,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_job_requisition",
    resourceId: row.id,
  })

  revalidateRecruitment()
  return { ok: true, id: row.id }
}

export async function createCandidateApplicationAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createCandidateApplicationFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    requisitionId: formData.get("requisitionId"),
    legalName: formData.get("legalName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    source: formData.get("source"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.legalName?.[0] ?? fe.requisitionId?.[0],
    })
  }

  const [req] = await db
    .select({ id: hrmJobRequisition.id, status: hrmJobRequisition.status })
    .from(hrmJobRequisition)
    .where(
      and(
        eq(hrmJobRequisition.organizationId, organizationId),
        eq(hrmJobRequisition.id, parsed.data.requisitionId)
      )
    )
    .limit(1)
  if (!req || req.status !== "open") {
    return hrmActionFailure({
      form: "Requisition is not accepting applications.",
    })
  }

  const email = normalizeNullable(parsed.data.email)?.toLowerCase() ?? null
  const phone = normalizeNullable(parsed.data.phone)
  const source = normalizeNullable(parsed.data.source)

  let candidateId: string
  if (email) {
    const [candidate] = await db
      .select({ id: hrmCandidate.id })
      .from(hrmCandidate)
      .where(
        and(
          eq(hrmCandidate.organizationId, organizationId),
          eq(hrmCandidate.email, email),
          isNull(hrmCandidate.archivedAt)
        )
      )
      .limit(1)
    candidateId = candidate?.id ?? crypto.randomUUID()
  } else {
    candidateId = crypto.randomUUID()
  }

  const applicationId = crypto.randomUUID()
  try {
    await db.transaction(async (tx) => {
      if (candidateId === applicationId) {
        throw new Error("Candidate/application id collision.")
      }
      const [existingCandidate] = await tx
        .select({ id: hrmCandidate.id })
        .from(hrmCandidate)
        .where(
          and(
            eq(hrmCandidate.organizationId, organizationId),
            eq(hrmCandidate.id, candidateId)
          )
        )
        .limit(1)

      if (!existingCandidate) {
        await tx.insert(hrmCandidate).values({
          id: candidateId,
          organizationId,
          legalName: parsed.data.legalName,
          email,
          phone,
          source,
          createdByUserId: userId,
          updatedByUserId: userId,
        })
        await recordRecruitmentEvent(tx, {
          organizationId,
          subjectKind: "candidate",
          subjectId: candidateId,
          eventType: "candidate.created",
          actorUserId: userId,
          metadata: { hasEmail: Boolean(email), source },
        })
      }

      await tx.insert(hrmApplication).values({
        id: applicationId,
        organizationId,
        candidateId,
        requisitionId: parsed.data.requisitionId,
        stage: "applied",
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      await recordRecruitmentEvent(tx, {
        organizationId,
        subjectKind: "application",
        subjectId: applicationId,
        eventType: "application.created",
        actorUserId: userId,
        toState: "applied",
        metadata: { candidateId, requisitionId: parsed.data.requisitionId },
      })
    })
  } catch (err) {
    if (uniqueViolation(err)) {
      return hrmActionFailure({
        form: "This candidate is already linked to the requisition.",
      })
    }
    return hrmActionFailure({ form: "Could not create application." })
  }

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.application.create,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_application",
    resourceId: applicationId,
    metadata: { candidateId, requisitionId: parsed.data.requisitionId },
  })

  revalidateRecruitment()
  return { ok: true, id: applicationId }
}

export async function advanceApplicationStageAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = advanceApplicationStageFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    stage: formData.get("stage"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid application update." })
  }
  if (parsed.data.stage === "offer" || parsed.data.stage === "hired") {
    return hrmActionFailure({
      form: "Use the offer and hire conversion workflow for this stage.",
    })
  }

  const [app] = await db
    .select({ id: hrmApplication.id, stage: hrmApplication.stage })
    .from(hrmApplication)
    .where(
      and(
        eq(hrmApplication.organizationId, organizationId),
        eq(hrmApplication.id, parsed.data.applicationId)
      )
    )
    .limit(1)
  if (!app) {
    return hrmActionFailure({ form: "Application not found." })
  }

  const from = assertApplicationStage(app.stage)
  const to = parsed.data.stage
  if (!canTransitionApplicationStage(from, to)) {
    return hrmActionFailure({
      form: `Cannot move application from ${from} to ${to}.`,
    })
  }

  await db
    .update(hrmApplication)
    .set({
      stage: to,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(eq(hrmApplication.id, app.id))
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "application",
    subjectId: app.id,
    eventType: "application.stage_changed",
    actorUserId: userId,
    fromState: from,
    toState: to,
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.application.stage,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_application",
    resourceId: app.id,
    metadata: { from, to },
  })

  revalidateRecruitment()
  return { ok: true, id: app.id }
}

export async function scheduleInterviewAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = scheduleInterviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    interviewerUserId: formData.get("interviewerUserId"),
    scheduledAt: formData.get("scheduledAt"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid interview schedule." })
  }

  const scheduledAt = parseDateTime(parsed.data.scheduledAt)
  if (!scheduledAt) {
    return hrmActionFailure({ scheduledAt: "Invalid interview date/time." })
  }

  const [member] = await db
    .select({ id: neonAuthMember.id })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.organizationId, organizationId),
        eq(neonAuthMember.userId, parsed.data.interviewerUserId)
      )
    )
    .limit(1)
  if (!member) {
    return hrmActionFailure({
      form: "Interviewer must be an active organization member.",
    })
  }

  const [app] = await db
    .select({ id: hrmApplication.id, stage: hrmApplication.stage })
    .from(hrmApplication)
    .where(
      and(
        eq(hrmApplication.organizationId, organizationId),
        eq(hrmApplication.id, parsed.data.applicationId)
      )
    )
    .limit(1)
  if (!app) {
    return hrmActionFailure({ form: "Application not found." })
  }
  if (assertApplicationStage(app.stage) !== "interview") {
    return hrmActionFailure({
      form: "Interviews can only be scheduled for applications in interview.",
    })
  }

  const interviewId = crypto.randomUUID()
  await db.insert(hrmInterview).values({
    id: interviewId,
    organizationId,
    applicationId: app.id,
    interviewerUserId: parsed.data.interviewerUserId,
    scheduledAt,
    createdByUserId: userId,
    updatedByUserId: userId,
  })
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "interview",
    subjectId: interviewId,
    eventType: "interview.scheduled",
    actorUserId: userId,
    metadata: { applicationId: app.id, scheduledAt: scheduledAt.toISOString() },
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.interview.schedule,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_interview",
    resourceId: interviewId,
    metadata: { applicationId: app.id },
  })

  revalidateRecruitment()
  return { ok: true, id: interviewId }
}

export async function submitInterviewFeedbackAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = submitInterviewFeedbackFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    interviewId: formData.get("interviewId"),
    outcome: formData.get("outcome"),
    feedback: formData.get("feedback"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid interview feedback." })
  }

  const [interview] = await db
    .select({
      id: hrmInterview.id,
      applicationId: hrmInterview.applicationId,
      outcome: hrmInterview.outcome,
    })
    .from(hrmInterview)
    .innerJoin(
      hrmApplication,
      and(
        eq(hrmApplication.id, hrmInterview.applicationId),
        eq(hrmApplication.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(hrmInterview.organizationId, organizationId),
        eq(hrmInterview.id, parsed.data.interviewId)
      )
    )
    .limit(1)
  if (!interview) {
    return hrmActionFailure({ form: "Interview not found." })
  }

  await db
    .update(hrmInterview)
    .set({
      outcome: parsed.data.outcome,
      feedback: {
        note: normalizeNullable(parsed.data.feedback),
        recordedAt: new Date().toISOString(),
        recordedByUserId: userId,
      },
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(eq(hrmInterview.id, interview.id))
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "interview",
    subjectId: interview.id,
    eventType: INTERVIEW_OUTCOME_TO_EVENT[parsed.data.outcome],
    actorUserId: userId,
    fromState: interview.outcome,
    toState: parsed.data.outcome,
    metadata: { applicationId: interview.applicationId },
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.interview.feedback,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_interview",
    resourceId: interview.id,
    metadata: {
      applicationId: interview.applicationId,
      outcome: parsed.data.outcome,
    },
  })

  revalidateRecruitment()
  return { ok: true, id: interview.id }
}

export async function submitInterviewScorecardAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = submitInterviewScorecardFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    interviewId: formData.get("interviewId"),
    recommendation: formData.get("recommendation"),
    overallRating: formData.get("overallRating") ?? undefined,
    comments: formData.get("comments") ?? undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid interview scorecard." })
  }

  const [interview] = await db
    .select({
      id: hrmInterview.id,
      applicationId: hrmInterview.applicationId,
      interviewerUserId: hrmInterview.interviewerUserId,
    })
    .from(hrmInterview)
    .where(
      and(
        eq(hrmInterview.organizationId, organizationId),
        eq(hrmInterview.id, parsed.data.interviewId)
      )
    )
    .limit(1)
  if (!interview) return hrmActionFailure({ form: "Interview not found." })

  const scorecardId = crypto.randomUUID()
  await db.insert(hrmInterviewScorecard).values({
    id: scorecardId,
    organizationId,
    interviewId: interview.id,
    applicationId: interview.applicationId,
    interviewerUserId: interview.interviewerUserId,
    overallRating: parsed.data.overallRating ?? null,
    recommendation: parsed.data.recommendation,
    comments: normalizeNullable(parsed.data.comments),
  })
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "scorecard",
    subjectId: scorecardId,
    eventType: "interview.scorecard_submitted",
    actorUserId: userId,
    metadata: {
      interviewId: interview.id,
      applicationId: interview.applicationId,
      recommendation: parsed.data.recommendation,
    },
  })
  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.interview.scorecardSubmit,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_interview_scorecard",
    resourceId: scorecardId,
    metadata: { interviewId: interview.id },
  })
  revalidateRecruitment()
  return { ok: true, id: scorecardId }
}

export async function evaluateScreeningAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = evaluateScreeningFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes") ?? undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid screening result." })
  }

  await db
    .update(hrmApplication)
    .set({
      screeningOutcome: parsed.data.outcome,
      screeningSnapshot: {
        notes: normalizeNullable(parsed.data.notes),
        recordedAt: new Date().toISOString(),
        recordedByUserId: userId,
      },
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmApplication.organizationId, organizationId),
        eq(hrmApplication.id, parsed.data.applicationId)
      )
    )
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "application",
    subjectId: parsed.data.applicationId,
    eventType: "application.screened",
    actorUserId: userId,
    toState: parsed.data.outcome,
  })
  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.application.stage,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_application",
    resourceId: parsed.data.applicationId,
    metadata: { screeningOutcome: parsed.data.outcome },
  })
  revalidateRecruitment()
  return { ok: true, id: parsed.data.applicationId }
}

export async function recordAssessmentResultAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate
  const parsed = recordAssessmentResultFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    assessmentType: formData.get("assessmentType"),
    status: formData.get("status"),
    score: formData.get("score") ?? undefined,
    result: formData.get("result") ?? undefined,
    providerReference: formData.get("providerReference") ?? undefined,
  })
  if (!parsed.success) return hrmActionFailure({ form: "Invalid assessment." })

  const assessmentId = crypto.randomUUID()
  await db.insert(hrmRecruitmentAssessment).values({
    id: assessmentId,
    organizationId,
    applicationId: parsed.data.applicationId,
    assessmentType: parsed.data.assessmentType,
    status: parsed.data.status,
    completedAt: parsed.data.status === "completed" ? new Date() : null,
    score: normalizeNullable(parsed.data.score),
    result: normalizeNullable(parsed.data.result),
    providerReference: normalizeNullable(parsed.data.providerReference),
    createdByUserId: userId,
    updatedByUserId: userId,
  })
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "assessment",
    subjectId: assessmentId,
    eventType: "assessment.recorded",
    actorUserId: userId,
    toState: parsed.data.status,
    metadata: { applicationId: parsed.data.applicationId },
  })
  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.application.stage,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_recruitment_assessment",
    resourceId: assessmentId,
  })
  revalidateRecruitment()
  return { ok: true, id: assessmentId }
}

export async function recordRecruitmentCommunicationAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate
  const parsed = recordRecruitmentCommunicationFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId") ?? undefined,
    candidateId: formData.get("candidateId") ?? undefined,
    communicationType: formData.get("communicationType"),
    recipient: formData.get("recipient") ?? undefined,
    providerReference: formData.get("providerReference") ?? undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid communication record." })
  }

  const communicationId = crypto.randomUUID()
  await db.insert(hrmRecruitmentCommunication).values({
    id: communicationId,
    organizationId,
    applicationId: normalizeNullable(parsed.data.applicationId),
    candidateId: normalizeNullable(parsed.data.candidateId),
    communicationType: parsed.data.communicationType,
    recipient: normalizeNullable(parsed.data.recipient),
    providerReference: normalizeNullable(parsed.data.providerReference),
    sentAt: new Date(),
    createdByUserId: userId,
  })
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "communication",
    subjectId: communicationId,
    eventType: `communication.${parsed.data.communicationType}`,
    actorUserId: userId,
    metadata: { applicationId: parsed.data.applicationId },
  })
  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.application.stage,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_recruitment_communication",
    resourceId: communicationId,
  })
  revalidateRecruitment()
  return { ok: true, id: communicationId }
}

export async function recordPreEmploymentCheckAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate
  const parsed = recordPreEmploymentCheckFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    checkType: formData.get("checkType"),
    status: formData.get("status"),
    result: formData.get("result") ?? undefined,
    providerReference: formData.get("providerReference") ?? undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid pre-employment check." })
  }

  const checkId = crypto.randomUUID()
  await db.insert(hrmPreEmploymentCheck).values({
    id: checkId,
    organizationId,
    applicationId: parsed.data.applicationId,
    checkType: parsed.data.checkType,
    status: parsed.data.status,
    result: normalizeNullable(parsed.data.result),
    providerReference: normalizeNullable(parsed.data.providerReference),
    completedAt:
      parsed.data.status === "passed" ||
      parsed.data.status === "failed" ||
      parsed.data.status === "waived"
        ? new Date()
        : null,
    createdByUserId: userId,
    updatedByUserId: userId,
  })
  await recordRecruitmentEvent(db, {
    organizationId,
    subjectKind: "pre_employment_check",
    subjectId: checkId,
    eventType: "pre_employment_check.recorded",
    actorUserId: userId,
    toState: parsed.data.status,
    metadata: { applicationId: parsed.data.applicationId },
  })
  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.hire.convert,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_pre_employment_check",
    resourceId: checkId,
  })
  revalidateRecruitment()
  return { ok: true, id: checkId }
}

export async function createJobOfferAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createJobOfferFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    compensationAmount: formData.get("compensationAmount"),
    compensationCurrency: formData.get("compensationCurrency") ?? "MYR",
    proposedStartDate: formData.get("proposedStartDate"),
    expiresAt: formData.get("expiresAt"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.applicationId?.[0],
      compensationAmount: fe.compensationAmount?.[0],
      proposedStartDate: fe.proposedStartDate?.[0],
      expiresAt: fe.expiresAt?.[0],
    })
  }

  const proposedStartDate = parseDateOnly(parsed.data.proposedStartDate)
  if (parsed.data.proposedStartDate && !proposedStartDate) {
    return hrmActionFailure({ proposedStartDate: "Invalid start date." })
  }
  const expiresAt = parseDateTime(parsed.data.expiresAt)
  if (parsed.data.expiresAt && !expiresAt) {
    return hrmActionFailure({ expiresAt: "Invalid expiry date/time." })
  }

  const [app] = await db
    .select({ id: hrmApplication.id, stage: hrmApplication.stage })
    .from(hrmApplication)
    .where(
      and(
        eq(hrmApplication.organizationId, organizationId),
        eq(hrmApplication.id, parsed.data.applicationId)
      )
    )
    .limit(1)
  if (!app) {
    return hrmActionFailure({ form: "Application not found." })
  }
  const from = assertApplicationStage(app.stage)
  if (from !== "interview" && from !== "offer") {
    return hrmActionFailure({
      form: "Offers can only be created after interview.",
    })
  }

  const existingOffers = await db
    .select({ id: hrmJobOffer.id, status: hrmJobOffer.status })
    .from(hrmJobOffer)
    .where(
      and(
        eq(hrmJobOffer.organizationId, organizationId),
        eq(hrmJobOffer.applicationId, app.id)
      )
    )
  if (
    existingOffers.some((offer) => {
      const status = assertOfferStatus(offer.status)
      return (
        status !== "declined" && status !== "withdrawn" && status !== "expired"
      )
    })
  ) {
    return hrmActionFailure({
      form: "An active offer already exists for this application.",
    })
  }

  const offerId = crypto.randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(hrmJobOffer).values({
      id: offerId,
      organizationId,
      applicationId: app.id,
      status: "draft",
      compensationAmount: normalizeNullable(parsed.data.compensationAmount),
      compensationCurrency: parsed.data.compensationCurrency,
      proposedStartDate,
      expiresAt,
      notes: normalizeNullable(parsed.data.notes),
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "offer",
      subjectId: offerId,
      eventType: "offer.created",
      actorUserId: userId,
      toState: "draft",
      metadata: { applicationId: app.id },
    })

    if (from === "interview") {
      if (!canTransitionApplicationStage(from, "offer")) {
        throw new Error("Invalid application transition to offer.")
      }
      await tx
        .update(hrmApplication)
        .set({
          stage: "offer",
          updatedAt: new Date(),
          updatedByUserId: userId,
        })
        .where(eq(hrmApplication.id, app.id))
      await recordRecruitmentEvent(tx, {
        organizationId,
        subjectKind: "application",
        subjectId: app.id,
        eventType: "application.stage_changed",
        actorUserId: userId,
        fromState: from,
        toState: "offer",
        metadata: { offerId },
      })
    }
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.offer.create,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_job_offer",
    resourceId: offerId,
    metadata: { applicationId: app.id },
  })

  revalidateRecruitment()
  return { ok: true, id: offerId }
}

export async function updateJobOfferStatusAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = updateJobOfferStatusFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    offerId: formData.get("offerId"),
    status: formData.get("status"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid offer update." })
  }
  if (parsed.data.status === "draft") {
    return hrmActionFailure({ status: "Offer cannot return to draft." })
  }

  const [offer] = await db
    .select({
      id: hrmJobOffer.id,
      status: hrmJobOffer.status,
      currentApprovalId: hrmJobOffer.currentApprovalId,
      applicationId: hrmJobOffer.applicationId,
      applicationStage: hrmApplication.stage,
    })
    .from(hrmJobOffer)
    .innerJoin(
      hrmApplication,
      and(
        eq(hrmApplication.id, hrmJobOffer.applicationId),
        eq(hrmApplication.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(hrmJobOffer.organizationId, organizationId),
        eq(hrmJobOffer.id, parsed.data.offerId)
      )
    )
    .limit(1)
  if (!offer) {
    return hrmActionFailure({ form: "Offer not found." })
  }

  const from = assertOfferStatus(offer.status)
  const to = parsed.data.status
  if (!canTransitionOfferStatus(from, to)) {
    return hrmActionFailure({
      form: `Cannot move offer from ${from} to ${to}.`,
    })
  }

  await db.transaction(async (tx) => {
    await tx
      .update(hrmJobOffer)
      .set({ status: to, updatedAt: new Date(), updatedByUserId: userId })
      .where(eq(hrmJobOffer.id, offer.id))
    if (
      from === "pending_approval" &&
      to === "approved" &&
      offer.currentApprovalId
    ) {
      await tx
        .update(hrmApproval)
        .set({
          state: "approved",
          decisionByUserId: userId,
          decisionAt: new Date(),
          updatedAt: new Date(),
          updatedByUserId: userId,
        })
        .where(eq(hrmApproval.id, offer.currentApprovalId))
    }
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "offer",
      subjectId: offer.id,
      eventType: `offer.${to}`,
      actorUserId: userId,
      fromState: from,
      toState: to,
      metadata: { applicationId: offer.applicationId },
    })

    if (to === "declined") {
      const appStage = assertApplicationStage(offer.applicationStage)
      if (canTransitionApplicationStage(appStage, "rejected")) {
        await tx
          .update(hrmApplication)
          .set({
            stage: "rejected",
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(eq(hrmApplication.id, offer.applicationId))
        await recordRecruitmentEvent(tx, {
          organizationId,
          subjectKind: "application",
          subjectId: offer.applicationId,
          eventType: "application.stage_changed",
          actorUserId: userId,
          fromState: appStage,
          toState: "rejected",
          metadata: { offerId: offer.id },
        })
      }
    }
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.offer.updateStatus,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_job_offer",
    resourceId: offer.id,
    metadata: { from, to, applicationId: offer.applicationId },
  })

  revalidateRecruitment()
  return { ok: true, id: offer.id }
}

export async function convertAcceptedOfferToEmployeeAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = convertAcceptedOfferFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    offerId: formData.get("offerId"),
    employeeNumber: formData.get("employeeNumber"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form: fe.offerId?.[0],
      employeeNumber: fe.employeeNumber?.[0],
    })
  }

  const [offer] = await db
    .select({
      id: hrmJobOffer.id,
      status: hrmJobOffer.status,
      proposedStartDate: hrmJobOffer.proposedStartDate,
      applicationId: hrmApplication.id,
      applicationStage: hrmApplication.stage,
      convertedEmployeeId: hrmApplication.convertedEmployeeId,
      candidateName: hrmCandidate.legalName,
      candidateEmail: hrmCandidate.email,
      requisitionId: hrmJobRequisition.id,
      requisitionStatus: hrmJobRequisition.status,
      headcount: hrmJobRequisition.headcount,
      departmentId: hrmJobRequisition.departmentId,
    })
    .from(hrmJobOffer)
    .innerJoin(
      hrmApplication,
      and(
        eq(hrmApplication.id, hrmJobOffer.applicationId),
        eq(hrmApplication.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmCandidate,
      and(
        eq(hrmCandidate.id, hrmApplication.candidateId),
        eq(hrmCandidate.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmJobRequisition,
      and(
        eq(hrmJobRequisition.id, hrmApplication.requisitionId),
        eq(hrmJobRequisition.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(hrmJobOffer.organizationId, organizationId),
        eq(hrmJobOffer.id, parsed.data.offerId)
      )
    )
    .limit(1)
  if (!offer) {
    return hrmActionFailure({ form: "Offer not found." })
  }
  if (assertOfferStatus(offer.status) !== "accepted") {
    return hrmActionFailure({ form: "Only accepted offers can be converted." })
  }
  if (assertApplicationStage(offer.applicationStage) !== "offer") {
    return hrmActionFailure({
      form: "Application is not ready for hire conversion.",
    })
  }
  if (offer.convertedEmployeeId) {
    return hrmActionFailure({ form: "Offer has already been converted." })
  }

  const checkRows = await db
    .select({ status: hrmPreEmploymentCheck.status })
    .from(hrmPreEmploymentCheck)
    .where(
      and(
        eq(hrmPreEmploymentCheck.organizationId, organizationId),
        eq(hrmPreEmploymentCheck.applicationId, offer.applicationId)
      )
    )
  const checkStatuses = checkRows.map((row) => {
    switch (row.status) {
      case "passed":
      case "waived":
      case "failed":
      case "in_progress":
      case "pending":
        return row.status
      default:
        return "pending"
    }
  })
  if (!preEmploymentChecksReadyForHire(checkStatuses)) {
    return hrmActionFailure({
      form: "Pre-employment checks must pass or be waived before conversion.",
    })
  }

  if (offer.departmentId) {
    const fk = await assertOptionalHrmPlacementFkBelongsToOrg(organizationId, {
      departmentId: offer.departmentId,
      positionId: null,
      gradeId: null,
    })
    if (!fk.ok) return hrmActionFailure({ form: fk.message })
  }

  const result = await db.transaction(async (tx) => {
    const employee = await createEmployeeMutation(
      {
        organizationId,
        actorUserId: userId,
        employeeNumber: parsed.data.employeeNumber,
        legalName: offer.candidateName,
        email: offer.candidateEmail,
        employmentStartDate: offer.proposedStartDate,
        currentDepartmentId: offer.departmentId,
      },
      tx
    )
    if (!employee.ok) {
      return { ok: false as const, message: employee.message }
    }

    await tx
      .update(hrmApplication)
      .set({
        stage: "hired",
        convertedEmployeeId: employee.employeeId,
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(eq(hrmApplication.id, offer.applicationId))
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "application",
      subjectId: offer.applicationId,
      eventType: "application.hired",
      actorUserId: userId,
      fromState: "offer",
      toState: "hired",
      metadata: { offerId: offer.id, employeeId: employee.employeeId },
    })
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "offer",
      subjectId: offer.id,
      eventType: "offer.converted_to_employee",
      actorUserId: userId,
      fromState: "accepted",
      toState: "converted",
      metadata: {
        applicationId: offer.applicationId,
        employeeId: employee.employeeId,
      },
    })

    const [hiredCount] = await tx
      .select({ n: count() })
      .from(hrmApplication)
      .where(
        and(
          eq(hrmApplication.organizationId, organizationId),
          eq(hrmApplication.requisitionId, offer.requisitionId),
          eq(hrmApplication.stage, "hired")
        )
      )
      .limit(1)

    if (
      (hiredCount?.n ?? 0) >= offer.headcount &&
      canTransitionRequisitionStatus(
        assertRequisitionStatus(offer.requisitionStatus),
        "filled"
      )
    ) {
      await tx
        .update(hrmJobRequisition)
        .set({
          status: "filled",
          updatedAt: new Date(),
          updatedByUserId: userId,
        })
        .where(eq(hrmJobRequisition.id, offer.requisitionId))
      await recordRecruitmentEvent(tx, {
        organizationId,
        subjectKind: "requisition",
        subjectId: offer.requisitionId,
        eventType: "requisition.filled",
        actorUserId: userId,
        fromState: offer.requisitionStatus,
        toState: "filled",
        metadata: {
          hiredCount: hiredCount?.n ?? 0,
          headcount: offer.headcount,
        },
      })
    }

    return { ok: true as const, employeeId: employee.employeeId }
  })

  if (!result.ok) {
    return hrmActionFailure({ form: result.message })
  }

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.hire.convert,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_application",
    resourceId: offer.applicationId,
    metadata: { offerId: offer.id, employeeId: result.employeeId },
  })
  auditRecruitment({
    action: "erp.hrm.employee.create",
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_employee",
    resourceId: result.employeeId,
    metadata: {
      source: "hrm_recruitment",
      applicationId: offer.applicationId,
      offerId: offer.id,
    },
  })

  revalidateRecruitment()
  return { ok: true, id: result.employeeId }
}

export async function requestJobOfferApprovalAction(
  _prev: RecruitmentMutationFormState | undefined,
  formData: FormData
): Promise<RecruitmentMutationFormState> {
  const gate = await requireRecruitmentGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const offerId = formData.get("offerId")
  if (typeof offerId !== "string") {
    return hrmActionFailure({ form: "Invalid offer." })
  }

  const [offer] = await db
    .select({
      id: hrmJobOffer.id,
      status: hrmJobOffer.status,
      applicationId: hrmJobOffer.applicationId,
      candidateName: hrmCandidate.legalName,
      requisitionTitle: hrmJobRequisition.title,
      compensationAmount: hrmJobOffer.compensationAmount,
      compensationCurrency: hrmJobOffer.compensationCurrency,
    })
    .from(hrmJobOffer)
    .innerJoin(
      hrmApplication,
      and(
        eq(hrmApplication.id, hrmJobOffer.applicationId),
        eq(hrmApplication.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmCandidate,
      and(
        eq(hrmCandidate.id, hrmApplication.candidateId),
        eq(hrmCandidate.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmJobRequisition,
      and(
        eq(hrmJobRequisition.id, hrmApplication.requisitionId),
        eq(hrmJobRequisition.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(hrmJobOffer.organizationId, organizationId),
        eq(hrmJobOffer.id, offerId)
      )
    )
    .limit(1)
  if (!offer) return hrmActionFailure({ form: "Offer not found." })
  const from = assertOfferStatus(offer.status)
  if (!canTransitionOfferStatus(from, "pending_approval")) {
    return hrmActionFailure({ form: "Only draft offers can request approval." })
  }

  const approvalId = crypto.randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: RECRUITMENT_OFFER_APPROVAL_SUBJECT,
      subjectId: offer.id,
      requestedByUserId: userId,
      snapshot: {
        candidateName: offer.candidateName,
        requisitionTitle: offer.requisitionTitle,
        compensationAmount: offer.compensationAmount,
        compensationCurrency: offer.compensationCurrency,
      },
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    await tx
      .update(hrmJobOffer)
      .set({
        status: "pending_approval",
        currentApprovalId: approvalId,
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(eq(hrmJobOffer.id, offer.id))
    await recordRecruitmentEvent(tx, {
      organizationId,
      subjectKind: "offer",
      subjectId: offer.id,
      eventType: "offer.approval_requested",
      actorUserId: userId,
      fromState: from,
      toState: "pending_approval",
      metadata: { approvalId, applicationId: offer.applicationId },
    })
  })

  auditRecruitment({
    action: HRM_RECRUITMENT_AUDIT.offer.updateStatus,
    organizationId,
    userId,
    sessionId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: { offerId: offer.id, applicationId: offer.applicationId },
  })
  revalidateRecruitment()
  return { ok: true, id: approvalId }
}

export async function approveJobOfferAction(formData: FormData): Promise<void> {
  void (await requestJobOfferApprovalAction(undefined, formData))
}

export async function sendJobOfferAction(formData: FormData): Promise<void> {
  formData.set("status", "sent")
  void (await updateJobOfferStatusAction(undefined, formData))
}

export async function acceptJobOfferAction(formData: FormData): Promise<void> {
  formData.set("status", "accepted")
  void (await updateJobOfferStatusAction(undefined, formData))
}

export async function rejectJobOfferAction(formData: FormData): Promise<void> {
  formData.set("status", "declined")
  void (await updateJobOfferStatusAction(undefined, formData))
}

export async function withdrawJobOfferAction(
  formData: FormData
): Promise<void> {
  formData.set("status", "withdrawn")
  void (await updateJobOfferStatusAction(undefined, formData))
}

/** Native `<form action>` entrypoints — state is not surfaced on this RSC page. */
export async function createJobRequisitionFormAction(
  formData: FormData
): Promise<void> {
  void (await createJobRequisitionAction(undefined, formData))
}

export async function publishJobRequisitionFormAction(
  formData: FormData
): Promise<void> {
  void (await publishJobRequisitionAction(undefined, formData))
}

export async function requestRequisitionApprovalFormAction(
  formData: FormData
): Promise<void> {
  void (await requestRequisitionApprovalAction(undefined, formData))
}

export async function cancelJobRequisitionFormAction(
  formData: FormData
): Promise<void> {
  void (await cancelJobRequisitionAction(undefined, formData))
}

export async function createCandidateApplicationFormAction(
  formData: FormData
): Promise<void> {
  void (await createCandidateApplicationAction(undefined, formData))
}

export async function advanceApplicationStageFormAction(
  formData: FormData
): Promise<void> {
  void (await advanceApplicationStageAction(undefined, formData))
}

export async function scheduleInterviewFormAction(
  formData: FormData
): Promise<void> {
  void (await scheduleInterviewAction(undefined, formData))
}

export async function submitInterviewFeedbackFormAction(
  formData: FormData
): Promise<void> {
  void (await submitInterviewFeedbackAction(undefined, formData))
}

export async function submitInterviewScorecardFormAction(
  formData: FormData
): Promise<void> {
  void (await submitInterviewScorecardAction(undefined, formData))
}

export async function createJobOfferFormAction(
  formData: FormData
): Promise<void> {
  void (await createJobOfferAction(undefined, formData))
}

export async function convertAcceptedOfferToEmployeeFormAction(
  formData: FormData
): Promise<void> {
  void (await convertAcceptedOfferToEmployeeAction(undefined, formData))
}
