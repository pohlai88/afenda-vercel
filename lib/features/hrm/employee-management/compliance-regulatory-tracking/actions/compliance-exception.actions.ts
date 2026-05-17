"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { isoDateOnlyToUtcDate } from "../../../hrm-calendar-dates.server"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"
import { requireComplianceMutationGate } from "../data/compliance-action-guard.server"
import {
  insertComplianceException,
  resolveComplianceException,
  waiveComplianceException,
} from "../data/compliance-exception.mutations.server"
import { HRM_COMPLIANCE_REGULATORY_AUDIT } from "../compliance-regulatory.contract"
import {
  createComplianceExceptionFormSchema,
  resolveComplianceExceptionFormSchema,
  waiveComplianceExceptionFormSchema,
} from "../schemas/compliance-exception.schema"

const ORG_DASHBOARD_HRM_COMPLIANCE = "/hrm/compliance" as const

function revalidateComplianceSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_COMPLIANCE),
    "page"
  )
}

function firstFieldError(
  fieldErrors: Record<string, string[] | undefined>
): string | undefined {
  for (const messages of Object.values(fieldErrors)) {
    const message = messages?.[0]
    if (message) return message
  }
  return undefined
}

export async function createComplianceExceptionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = createComplianceExceptionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId") || undefined,
    complianceArea: formData.get("complianceArea"),
    itemType: formData.get("itemType"),
    sourceReferenceId: formData.get("sourceReferenceId") || undefined,
    title: formData.get("title"),
    severity: formData.get("severity"),
    correctiveActionOwnerUserId:
      formData.get("correctiveActionOwnerUserId") || undefined,
    correctiveActionDueDate:
      formData.get("correctiveActionDueDate") || undefined,
    correctiveActionDescription:
      formData.get("correctiveActionDescription") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form:
        firstFieldError(parsed.error.flatten().fieldErrors) ??
        "Invalid compliance exception fields.",
    })
  }

  let exceptionId = ""
  await db.transaction(async (tx) => {
    exceptionId = await insertComplianceException(tx, {
      organizationId: gate.organizationId,
      employeeId: parsed.data.employeeId ?? null,
      complianceArea: parsed.data.complianceArea,
      itemType: parsed.data.itemType,
      sourceReferenceId: parsed.data.sourceReferenceId ?? null,
      title: parsed.data.title,
      severity: parsed.data.severity,
      status: parsed.data.correctiveActionOwnerUserId
        ? "corrective_action_assigned"
        : "open",
      correctiveActionOwnerUserId:
        parsed.data.correctiveActionOwnerUserId ?? null,
      correctiveActionDueDate: parsed.data.correctiveActionDueDate
        ? isoDateOnlyToUtcDate(parsed.data.correctiveActionDueDate)
        : null,
      correctiveActionDescription:
        parsed.data.correctiveActionDescription ?? null,
      createdByUserId: gate.userId,
    })
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.created,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_compliance_exception",
      resourceId: exceptionId,
      metadata: {
        complianceArea: parsed.data.complianceArea,
        severity: parsed.data.severity,
      },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

export async function resolveComplianceExceptionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = resolveComplianceExceptionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    exceptionId: formData.get("exceptionId"),
    resolutionNote: formData.get("resolutionNote"),
    evidenceDocumentId: formData.get("evidenceDocumentId") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form:
        firstFieldError(parsed.error.flatten().fieldErrors) ??
        "Invalid resolution fields.",
    })
  }

  let ok = false
  await db.transaction(async (tx) => {
    ok = await resolveComplianceException(tx, {
      organizationId: gate.organizationId,
      exceptionId: parsed.data.exceptionId,
      resolvedByUserId: gate.userId,
    })
  })
  if (!ok) {
    return hrmActionFailure({ form: "Exception not found or already closed." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.resolved,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_compliance_exception",
      resourceId: parsed.data.exceptionId,
      metadata: {
        resolutionNote: parsed.data.resolutionNote,
        evidenceDocumentId: parsed.data.evidenceDocumentId ?? null,
      },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

export async function waiveComplianceExceptionAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = waiveComplianceExceptionFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    exceptionId: formData.get("exceptionId"),
    waiverReason: formData.get("waiverReason"),
    approvalReference: formData.get("approvalReference"),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form:
        firstFieldError(parsed.error.flatten().fieldErrors) ??
        "Invalid waiver fields.",
    })
  }

  let ok = false
  await db.transaction(async (tx) => {
    ok = await waiveComplianceException(tx, {
      organizationId: gate.organizationId,
      exceptionId: parsed.data.exceptionId,
      waiverReason: `${parsed.data.waiverReason} (ref: ${parsed.data.approvalReference})`,
      waivedByUserId: gate.userId,
    })
  })
  if (!ok) {
    return hrmActionFailure({ form: "Exception not found or already closed." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.waived,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_compliance_exception",
      resourceId: parsed.data.exceptionId,
      metadata: { approvalReference: parsed.data.approvalReference },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

export async function resolveComplianceExceptionFormAction(
  formData: FormData
): Promise<void> {
  void (await resolveComplianceExceptionAction(undefined, formData))
}

export async function waiveComplianceExceptionFormAction(
  formData: FormData
): Promise<void> {
  void (await waiveComplianceExceptionAction(undefined, formData))
}
