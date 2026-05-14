"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { canActInOrganization } from "#lib/auth/permission.server"
import { db } from "#lib/db"
import {
  hrmApplication,
  hrmCandidate,
  hrmInterview,
  hrmJobRequisition,
} from "#lib/db/schema"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { ORG_DASHBOARD_HRM_RECRUITMENT } from "#lib/dashboard-module-paths"
import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../data/hrm-org-fk.server"
import {
  advanceApplicationStageFormSchema,
  createCandidateApplicationFormSchema,
  createJobRequisitionFormSchema,
  publishJobRequisitionFormSchema,
  scheduleInterviewFormSchema,
} from "../schemas/recruitment.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ContractMutationFormState } from "../types"

function revalidateRecruitment() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_RECRUITMENT),
    "page"
  )
}

export async function createJobRequisitionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = createJobRequisitionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    title: formData.get("title"),
    departmentId: formData.get("departmentId"),
    headcount: formData.get("headcount"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({ form: fe.title?.[0] ?? fe.orgSlug?.[0] })
  }

  const deptId =
    parsed.data.departmentId && parsed.data.departmentId.length > 0
      ? parsed.data.departmentId
      : null
  if (deptId) {
    const fk = await assertOptionalHrmPlacementFkBelongsToOrg(organizationId, {
      departmentId: deptId,
      positionId: null,
      gradeId: null,
    })
    if (!fk.ok) return hrmActionFailure({ form: fk.message })
  }

  const id = crypto.randomUUID()
  await db.insert(hrmJobRequisition).values({
    id,
    organizationId,
    title: parsed.data.title,
    departmentId: deptId,
    headcount: parsed.data.headcount ?? 1,
    status: "draft",
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.recruitment.requisition.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_job_requisition",
      resourceId: id,
      metadata: { title: parsed.data.title },
    })
  )

  revalidateRecruitment()
  return { ok: true }
}

export async function publishJobRequisitionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = publishJobRequisitionFormSchema.safeParse({
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
  if (!row || row.status !== "draft") {
    return hrmActionFailure({
      form: "Only draft requisitions can be published.",
    })
  }

  await db
    .update(hrmJobRequisition)
    .set({ status: "open", updatedAt: new Date(), updatedByUserId: userId })
    .where(eq(hrmJobRequisition.id, row.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.recruitment.requisition.publish",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_job_requisition",
      resourceId: row.id,
      metadata: {},
    })
  )

  revalidateRecruitment()
  return { ok: true }
}

export async function createCandidateApplicationAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

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
  if (!req || req.status === "cancelled" || req.status === "filled") {
    return hrmActionFailure({
      form: "Requisition is not accepting applications.",
    })
  }

  const candidateId = crypto.randomUUID()
  await db.insert(hrmCandidate).values({
    id: candidateId,
    organizationId,
    legalName: parsed.data.legalName,
    email: parsed.data.email?.trim() ? parsed.data.email.trim() : null,
    phone: parsed.data.phone?.trim() ? parsed.data.phone.trim() : null,
    source: parsed.data.source?.trim() ? parsed.data.source.trim() : null,
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  const applicationId = crypto.randomUUID()
  await db.insert(hrmApplication).values({
    id: applicationId,
    organizationId,
    candidateId,
    requisitionId: parsed.data.requisitionId,
    stage: "applied",
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.recruitment.application.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_application",
      resourceId: applicationId,
      metadata: { candidateId, requisitionId: parsed.data.requisitionId },
    })
  )

  revalidateRecruitment()
  return { ok: true }
}

export async function advanceApplicationStageAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = advanceApplicationStageFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    stage: formData.get("stage"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid application update." })
  }

  const [app] = await db
    .select({ id: hrmApplication.id })
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

  await db
    .update(hrmApplication)
    .set({
      stage: parsed.data.stage,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(eq(hrmApplication.id, app.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.recruitment.application.stage",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_application",
      resourceId: app.id,
      metadata: { stage: parsed.data.stage },
    })
  )

  revalidateRecruitment()
  return { ok: true }
}

export async function scheduleInterviewAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId, user } = session

  if (
    !(await canActInOrganization(userId, user.role, organizationId, "admin"))
  ) {
    return hrmActionFailure({ form: "Admin role required." })
  }

  const parsed = scheduleInterviewFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    applicationId: formData.get("applicationId"),
    interviewerUserId: formData.get("interviewerUserId"),
    scheduledAt: formData.get("scheduledAt"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid interview schedule." })
  }

  const atMs = Date.parse(parsed.data.scheduledAt)
  if (!Number.isFinite(atMs)) {
    return hrmActionFailure({ form: "Invalid interview date/time." })
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
  if (app.stage === "hired" || app.stage === "rejected") {
    return hrmActionFailure({
      form: "Cannot schedule interviews for closed applications.",
    })
  }

  const interviewId = crypto.randomUUID()
  await db.insert(hrmInterview).values({
    id: interviewId,
    organizationId,
    applicationId: app.id,
    interviewerUserId: parsed.data.interviewerUserId,
    scheduledAt: new Date(atMs),
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.recruitment.interview.schedule",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_interview",
      resourceId: interviewId,
      metadata: { applicationId: app.id },
    })
  )

  revalidateRecruitment()
  return { ok: true }
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
