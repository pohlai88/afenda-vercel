"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmComplianceFiling } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireComplianceMutationGate } from "../data/compliance-action-guard.server"
import {
  createComplianceFilingFormSchema,
  submitComplianceFilingFormSchema,
  confirmComplianceFilingFormSchema,
  waiveComplianceFilingFormSchema,
} from "../schemas/compliance-filing.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_COMPLIANCE_REGULATORY_AUDIT } from "../compliance-regulatory.contract"
import type { ContractMutationFormState } from "../../../types"

const COMPLIANCE_REVALIDATE_PATH = "/hrm/compliance" as const

function revalidateComplianceSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(COMPLIANCE_REVALIDATE_PATH),
    "page"
  )
}

/**
 * Creates a new mandatory filing requirement in the regulatory calendar.
 * HRM-CMP-009/010.
 */
export async function createFilingAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createComplianceFilingFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    title: formData.get("title"),
    filingCategory: formData.get("filingCategory"),
    countryCode: formData.get("countryCode") || undefined,
    legalEntityCode: formData.get("legalEntityCode") || undefined,
    legalEntityName: formData.get("legalEntityName") || undefined,
    workLocationCode: formData.get("workLocationCode") || undefined,
    employmentType: formData.get("employmentType") || undefined,
    workerCategory: formData.get("workerCategory") || undefined,
    filingAuthority: formData.get("filingAuthority") || undefined,
    referenceCode: formData.get("referenceCode") || undefined,
    dueDate: formData.get("dueDate"),
    coveragePeriod: formData.get("coveragePeriod") || undefined,
    notes: formData.get("notes") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid filing details.",
    })
  }

  const filingId = crypto.randomUUID()
  await db.insert(hrmComplianceFiling).values({
    id: filingId,
    organizationId,
    title: parsed.data.title,
    filingCategory: parsed.data.filingCategory,
    countryCode: parsed.data.countryCode ?? null,
    legalEntityCode: parsed.data.legalEntityCode ?? null,
    legalEntityName: parsed.data.legalEntityName ?? null,
    workLocationCode: parsed.data.workLocationCode ?? null,
    employmentType: parsed.data.employmentType ?? null,
    workerCategory: parsed.data.workerCategory ?? null,
    filingAuthority: parsed.data.filingAuthority ?? null,
    referenceCode: parsed.data.referenceCode ?? null,
    dueDate: new Date(`${parsed.data.dueDate}T00:00:00.000Z`),
    coveragePeriod: parsed.data.coveragePeriod ?? null,
    notes: parsed.data.notes ?? null,
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.filing.requirement_created,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_compliance_filing",
      resourceId: filingId,
      metadata: {
        title: parsed.data.title,
        filingCategory: parsed.data.filingCategory,
        dueDate: parsed.data.dueDate,
        countryCode: parsed.data.countryCode ?? null,
        legalEntityCode: parsed.data.legalEntityCode ?? null,
      },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

/**
 * Marks a pending filing as submitted to the authority.
 * Transitions status from "pending" → "submitted". HRM-CMP-009.
 */
export async function updateFilingAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = submitComplianceFilingFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    filingId: formData.get("filingId"),
    submittedAt: formData.get("submittedAt"),
    confirmationReference: formData.get("confirmationReference") || undefined,
    evidenceDocumentId: formData.get("evidenceDocumentId") || undefined,
    notes: formData.get("notes") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid submission details.",
    })
  }

  const [filing] = await db
    .select({ id: hrmComplianceFiling.id, status: hrmComplianceFiling.status })
    .from(hrmComplianceFiling)
    .where(
      and(
        eq(hrmComplianceFiling.organizationId, organizationId),
        eq(hrmComplianceFiling.id, parsed.data.filingId)
      )
    )
    .limit(1)

  if (!filing) {
    return hrmActionFailure({ form: "Filing not found." })
  }
  if (!["pending", "overdue"].includes(filing.status)) {
    return hrmActionFailure({
      form: "Only pending or overdue filings can be marked as submitted.",
    })
  }

  const now = new Date()
  await db
    .update(hrmComplianceFiling)
    .set({
      status: "submitted",
      submittedAt: new Date(`${parsed.data.submittedAt}T00:00:00.000Z`),
      submittedByUserId: userId,
      confirmationReference: parsed.data.confirmationReference ?? null,
      evidenceDocumentId: parsed.data.evidenceDocumentId ?? null,
      notes: parsed.data.notes ?? null,
      updatedAt: now,
      updatedByUserId: userId,
    })
    .where(eq(hrmComplianceFiling.id, filing.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.filing.submitted,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_compliance_filing",
      resourceId: filing.id,
      metadata: {
        submittedAt: parsed.data.submittedAt,
        confirmationReference: parsed.data.confirmationReference ?? null,
      },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

/**
 * Records official confirmation of receipt by the filing authority.
 * Transitions status from "submitted" → "confirmed". HRM-CMP-009.
 */
export async function completeFilingAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = confirmComplianceFilingFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    filingId: formData.get("filingId"),
    confirmedAt: formData.get("confirmedAt"),
    confirmationReference: formData.get("confirmationReference"),
    evidenceDocumentId: formData.get("evidenceDocumentId") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid confirmation details.",
    })
  }

  const [filing] = await db
    .select({ id: hrmComplianceFiling.id, status: hrmComplianceFiling.status })
    .from(hrmComplianceFiling)
    .where(
      and(
        eq(hrmComplianceFiling.organizationId, organizationId),
        eq(hrmComplianceFiling.id, parsed.data.filingId)
      )
    )
    .limit(1)

  if (!filing) {
    return hrmActionFailure({ form: "Filing not found." })
  }
  if (filing.status !== "submitted") {
    return hrmActionFailure({
      form: "Only submitted filings can be confirmed.",
    })
  }

  const now = new Date()
  await db
    .update(hrmComplianceFiling)
    .set({
      status: "confirmed",
      confirmedAt: new Date(`${parsed.data.confirmedAt}T00:00:00.000Z`),
      confirmationReference: parsed.data.confirmationReference,
      evidenceDocumentId: parsed.data.evidenceDocumentId ?? null,
      updatedAt: now,
      updatedByUserId: userId,
    })
    .where(eq(hrmComplianceFiling.id, filing.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.filing.confirmed,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_compliance_filing",
      resourceId: filing.id,
      metadata: {
        confirmedAt: parsed.data.confirmedAt,
        confirmationReference: parsed.data.confirmationReference,
      },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

/**
 * Formally waives a filing obligation with a documented reason.
 * HRM-CMP-009.
 */
export async function waiveFilingAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = waiveComplianceFilingFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    filingId: formData.get("filingId"),
    waiverReason: formData.get("waiverReason"),
    approvalReference: formData.get("approvalReference"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid waiver details.",
    })
  }

  const [filing] = await db
    .select({ id: hrmComplianceFiling.id, status: hrmComplianceFiling.status })
    .from(hrmComplianceFiling)
    .where(
      and(
        eq(hrmComplianceFiling.organizationId, organizationId),
        eq(hrmComplianceFiling.id, parsed.data.filingId)
      )
    )
    .limit(1)

  if (!filing) {
    return hrmActionFailure({ form: "Filing not found." })
  }
  if (filing.status === "confirmed") {
    return hrmActionFailure({ form: "Confirmed filings cannot be waived." })
  }

  const now = new Date()
  await db
    .update(hrmComplianceFiling)
    .set({
      status: "waived",
      waivedAt: now,
      waivedByUserId: userId,
      waiverReason: `${parsed.data.waiverReason} [Approval: ${parsed.data.approvalReference}]`,
      updatedAt: now,
      updatedByUserId: userId,
    })
    .where(eq(hrmComplianceFiling.id, filing.id))

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.filing.waived,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_compliance_filing",
      resourceId: filing.id,
      metadata: {
        approvalReference: parsed.data.approvalReference,
      },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

export async function createFilingFormAction(formData: FormData): Promise<void> {
  void (await createFilingAction(undefined, formData))
}

export async function updateFilingFormAction(formData: FormData): Promise<void> {
  void (await updateFilingAction(undefined, formData))
}

export async function completeFilingFormAction(
  formData: FormData
): Promise<void> {
  void (await completeFilingAction(undefined, formData))
}

export async function waiveFilingFormAction(formData: FormData): Promise<void> {
  void (await waiveFilingAction(undefined, formData))
}
