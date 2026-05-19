"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"
import { HRM_COMPLIANCE_REGULATORY_AUDIT } from "../compliance-regulatory.contract"
import { requireComplianceMutationGate } from "../data/compliance-action-guard.server"
import {
  archiveComplianceObligation,
  upsertComplianceObligation,
} from "../data/compliance-obligation.mutations.server"
import {
  archiveComplianceObligationFormSchema,
  upsertComplianceObligationFormSchema,
} from "../schemas/compliance-obligation.schema"

const COMPLIANCE_REVALIDATE_PATH = "/hrm/compliance" as const

function revalidateComplianceSurfaces() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(COMPLIANCE_REVALIDATE_PATH),
    "page"
  )
}

export async function upsertComplianceObligationAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = upsertComplianceObligationFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    obligationId: formData.get("obligationId") || undefined,
    code: formData.get("code"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    complianceArea: formData.get("complianceArea"),
    requirementKind: formData.get("requirementKind"),
    countryCode: formData.get("countryCode") || undefined,
    legalEntityCode: formData.get("legalEntityCode") || undefined,
    departmentId: formData.get("departmentId") || undefined,
    workLocationCode: formData.get("workLocationCode") || undefined,
    employmentType: formData.get("employmentType") || undefined,
    workerCategory: formData.get("workerCategory") || undefined,
    policyId: formData.get("policyId") || undefined,
    policyVersion: formData.get("policyVersion") || undefined,
    acknowledgementDeadline:
      formData.get("acknowledgementDeadline") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    alertLeadDays: formData.get("alertLeadDays") || undefined,
    sourceReferenceId: formData.get("sourceReferenceId") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form:
        parsed.error.flatten().formErrors[0] ??
        parsed.error.issues[0]?.message ??
        "Invalid compliance obligation fields.",
    })
  }

  let obligationId = ""
  await db.transaction(async (tx) => {
    obligationId = await upsertComplianceObligation(tx, {
      id: parsed.data.obligationId,
      organizationId: gate.organizationId,
      code: parsed.data.code,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      complianceArea: parsed.data.complianceArea,
      requirementKind: parsed.data.requirementKind,
      countryCode: parsed.data.countryCode ?? null,
      legalEntityCode: parsed.data.legalEntityCode ?? null,
      departmentId: parsed.data.departmentId ?? null,
      workLocationCode: parsed.data.workLocationCode ?? null,
      employmentType: parsed.data.employmentType ?? null,
      workerCategory: parsed.data.workerCategory ?? null,
      policyId: parsed.data.policyId ?? null,
      policyVersion: parsed.data.policyVersion ?? null,
      acknowledgementDeadline: parsed.data.acknowledgementDeadline
        ? new Date(`${parsed.data.acknowledgementDeadline}T00:00:00.000Z`)
        : null,
      dueDate: parsed.data.dueDate
        ? new Date(`${parsed.data.dueDate}T00:00:00.000Z`)
        : null,
      alertLeadDays: parsed.data.alertLeadDays ?? 7,
      sourceReferenceId: parsed.data.sourceReferenceId ?? null,
      actorUserId: gate.userId,
    })
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.obligation.configured,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_compliance_obligation",
      resourceId: obligationId,
      metadata: {
        code: parsed.data.code,
        requirementKind: parsed.data.requirementKind,
        complianceArea: parsed.data.complianceArea,
      },
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

export async function archiveComplianceObligationAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireComplianceMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = archiveComplianceObligationFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    obligationId: formData.get("obligationId"),
    status: "archived",
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid archive request.",
    })
  }

  let archived = false
  await db.transaction(async (tx) => {
    archived = await archiveComplianceObligation(tx, {
      organizationId: gate.organizationId,
      obligationId: parsed.data.obligationId,
      actorUserId: gate.userId,
    })
  })

  if (!archived) {
    return hrmActionFailure({ form: "Compliance obligation not found." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.obligation.archived,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_compliance_obligation",
      resourceId: parsed.data.obligationId,
    })
  )

  revalidateComplianceSurfaces()
  return { ok: true }
}

export async function upsertComplianceObligationFormAction(
  formData: FormData
): Promise<void> {
  await upsertComplianceObligationAction(undefined, formData)
}

export async function archiveComplianceObligationFormAction(
  formData: FormData
): Promise<void> {
  await archiveComplianceObligationAction(undefined, formData)
}
