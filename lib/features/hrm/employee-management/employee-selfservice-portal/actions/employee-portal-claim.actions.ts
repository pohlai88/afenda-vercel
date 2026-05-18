"use server"

import {
  attachClaimEvidenceForPortalEmployee,
  cancelClaimForPortalEmployee,
  submitClaimForEmployee,
} from "../../../payroll-compensation/expenses-reimbursement/data/claim-submission-mutation.server"
import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import {
  attachClaimEvidenceFormSchema,
  cancelClaimFormSchema,
  requestOwnClaimFormSchema,
} from "../../../payroll-compensation/expenses-reimbursement/schema/claim.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  AttachClaimEvidenceFormState,
  CancelClaimFormState,
  SubmitClaimFormState,
} from "../../../types"

async function resolvePortalContext(formData: FormData) {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return null
  }
  return getEmployeePortalContext(rawPortalSlug)
}

export async function submitPortalEmployeeClaimAction(
  _prev: SubmitClaimFormState | undefined,
  formData: FormData
): Promise<SubmitClaimFormState> {
  const context = await resolvePortalContext(formData)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = requestOwnClaimFormSchema.safeParse({
    claimTypeId: formData.get("claimTypeId"),
    claimDate: formData.get("claimDate"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || undefined,
    description: formData.get("description") || null,
    policyVersion: formData.get("policyVersion") || null,
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimTypeId: fieldErrors.claimTypeId?.[0],
      claimDate: fieldErrors.claimDate?.[0],
      amount: fieldErrors.amount?.[0],
      currency: fieldErrors.currency?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return submitClaimForEmployee({
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    ...parsed.data,
    submissionMode: "self_service",
    employeePortalAudit: true,
  })
}

export async function cancelPortalEmployeeClaimAction(
  _prev: CancelClaimFormState | undefined,
  formData: FormData
): Promise<CancelClaimFormState> {
  const context = await resolvePortalContext(formData)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = cancelClaimFormSchema.safeParse({
    claimId: formData.get("claimId"),
    cancelledReason: formData.get("cancelledReason") || null,
  })

  if (!parsed.success) {
    return hrmActionFailure({ claimId: parsed.error.issues[0]?.message })
  }

  return cancelClaimForPortalEmployee({
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    claimId: parsed.data.claimId,
    cancelledReason: parsed.data.cancelledReason ?? null,
  })
}

export async function attachPortalEmployeeClaimEvidenceAction(
  _prev: AttachClaimEvidenceFormState | undefined,
  formData: FormData
): Promise<AttachClaimEvidenceFormState> {
  const context = await resolvePortalContext(formData)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const parsed = attachClaimEvidenceFormSchema.safeParse({
    claimId: formData.get("claimId"),
    documentId: formData.get("documentId"),
    evidenceType: formData.get("evidenceType") ?? "receipt",
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      claimId: fieldErrors.claimId?.[0],
      documentId: fieldErrors.documentId?.[0],
      evidenceType: fieldErrors.evidenceType?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  return attachClaimEvidenceForPortalEmployee({
    organizationId: context.portal.organizationId,
    userId: context.portal.userId,
    sessionId: context.portal.sessionId,
    employeeId: context.employee.id,
    claimId: parsed.data.claimId,
    documentId: parsed.data.documentId,
    evidenceType: parsed.data.evidenceType,
    notes: parsed.data.notes ?? null,
  })
}
