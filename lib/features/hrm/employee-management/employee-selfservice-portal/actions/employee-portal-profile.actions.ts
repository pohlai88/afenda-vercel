"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import {
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import { hrmEssProfileUpdateRequest } from "#lib/db/schema"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { notifyEssRequestLifecycle } from "../data/employee-portal-notification.server"
import { HRM_ESS_AUDIT } from "../ess.contract"
import { getCurrentPayrollProfileForEmployee } from "../../../payroll-compensation/payroll-processing/data/payroll-profile.queries.server"
import {
  portalBankingProfileFormSchema,
  portalEmergencyContactFormSchema,
  portalPersonalProfileFormSchema,
} from "../schemas/employee-portal-profile.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { EmployeeMasterMutationFormState } from "../../../types"

function revalidatePortalProfile() {
  revalidatePath(toLocalePortalRevalidatePattern("/employee/profile"), "page")
}

function buildAddress(data: {
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  countryCode?: string
}): Record<string, string> | null {
  const address = {
    line1: data.addressLine1,
    line2: data.addressLine2,
    city: data.city,
    region: data.region,
    postalCode: data.postalCode,
    countryCode: data.countryCode,
  }
  const entries = Object.entries(address).filter(([, v]) => Boolean(v))
  if (entries.length === 0) return null
  return Object.fromEntries(entries) as Record<string, string>
}

async function createProfileUpdateRequest(input: {
  organizationId: string
  employeeId: string
  userId: string
  section: string
  requestedChanges: Record<string, unknown>
}): Promise<string> {
  const [request] = await db
    .insert(hrmEssProfileUpdateRequest)
    .values({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      section: input.section,
      requestedChanges: input.requestedChanges,
      status: "pending",
      submittedByUserId: input.userId,
    })
    .returning({ id: hrmEssProfileUpdateRequest.id })

  if (!request) {
    throw new Error("Profile update request was not created.")
  }

  return request.id
}

export async function updatePortalPersonalProfileAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const parsed = portalPersonalProfileFormSchema.safeParse({
    portalSlug: formData.get("portalSlug"),
    preferredName: formData.get("preferredName") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    gender: formData.get("gender") || undefined,
    nationality: formData.get("nationality") || undefined,
    maritalStatus: formData.get("maritalStatus") || undefined,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid personal profile.",
    })
  }

  const context = await getEmployeePortalContext(parsed.data.portalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const employeeId = context.employee.id
  const organizationId = context.portal.organizationId
  const userId = context.portal.userId

  try {
    return await withEmployeePortalActionSpan(
      context,
      "profile",
      "personal.update",
      async () => {
        const requestId = await createProfileUpdateRequest({
          organizationId,
          employeeId,
          userId,
          section: "personal",
          requestedChanges: {
            preferredName: parsed.data.preferredName ?? null,
            dateOfBirth: parsed.data.dateOfBirth ?? null,
            gender: parsed.data.gender ?? null,
            nationality: parsed.data.nationality ?? null,
            maritalStatus: parsed.data.maritalStatus ?? null,
          },
        })

        after(() =>
          writeIamAuditEventFromNextHeaders({
            action: HRM_ESS_AUDIT.profileUpdate.request,
            actorUserId: userId,
            actorSessionId: context.portal.sessionId,
            organizationId,
            resourceType: "hrm_ess_profile_update_request",
            resourceId: requestId,
            metadata: { surface: "employee_portal", section: "personal", employeeId },
          })
        )
        after(() =>
          notifyEssRequestLifecycle({
            organizationId,
            targetUserId: userId,
            kind: "profile_update",
            status: "submitted",
            requestId,
            employeeId,
          })
        )

        revalidatePortalProfile()
        return { ok: true }
      }
    )
  } catch (err) {
    return hrmActionFailure({
      form: err instanceof Error ? err.message : "Unable to update profile.",
    })
  }
}

export async function updatePortalEmergencyContactAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const parsed = portalEmergencyContactFormSchema.safeParse({
    portalSlug: formData.get("portalSlug"),
    personalEmail: formData.get("personalEmail") || undefined,
    personalPhone: formData.get("personalPhone") || undefined,
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    region: formData.get("region") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    countryCode: formData.get("countryCode") || undefined,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid emergency contact.",
    })
  }

  const context = await getEmployeePortalContext(parsed.data.portalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const employeeId = context.employee.id
  const organizationId = context.portal.organizationId
  const userId = context.portal.userId
  const address = buildAddress(parsed.data)

  try {
    return await withEmployeePortalActionSpan(
      context,
      "profile",
      "emergency.update",
      async () => {
        const requestId = await createProfileUpdateRequest({
          organizationId,
          employeeId,
          userId,
          section: "contact",
          requestedChanges: {
            personalEmail: parsed.data.personalEmail ?? null,
            personalPhone: parsed.data.personalPhone ?? null,
            address,
          },
        })

        after(() =>
          writeIamAuditEventFromNextHeaders({
            action: HRM_ESS_AUDIT.profileUpdate.request,
            actorUserId: userId,
            actorSessionId: context.portal.sessionId,
            organizationId,
            resourceType: "hrm_ess_profile_update_request",
            resourceId: requestId,
            metadata: { surface: "employee_portal", section: "contact", employeeId },
          })
        )
        after(() =>
          notifyEssRequestLifecycle({
            organizationId,
            targetUserId: userId,
            kind: "profile_update",
            status: "submitted",
            requestId,
            employeeId,
          })
        )

        revalidatePortalProfile()
        return { ok: true }
      }
    )
  } catch (err) {
    return hrmActionFailure({
      form: err instanceof Error ? err.message : "Unable to update contact.",
    })
  }
}

export async function updatePortalBankingProfileAction(
  _prev: EmployeeMasterMutationFormState | undefined,
  formData: FormData
): Promise<EmployeeMasterMutationFormState> {
  const parsed = portalBankingProfileFormSchema.safeParse({
    portalSlug: formData.get("portalSlug"),
    bankCode: formData.get("bankCode") || undefined,
    bankAccountHolderName: formData.get("bankAccountHolderName") || undefined,
    bankAccountTokenized: formData.get("bankAccountTokenized") || undefined,
  })

  if (!parsed.success) {
    return hrmActionFailure({
      form: parsed.error.issues[0]?.message ?? "Invalid banking details.",
    })
  }

  const context = await getEmployeePortalContext(parsed.data.portalSlug)
  if (!context) {
    return hrmActionFailure({ form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR })
  }

  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(
      locale,
      `/p/${parsed.data.portalSlug}/employee/profile/banking`
    ),
  })

  const employeeId = context.employee.id
  const organizationId = context.portal.organizationId
  const userId = context.portal.userId
  const currentProfile = await getCurrentPayrollProfileForEmployee(
    organizationId,
    employeeId
  )
  if (!currentProfile) {
    return hrmActionFailure({
      form: "Payroll profile is not set up yet. Contact HR to enable banking updates.",
    })
  }

  try {
    return await withEmployeePortalActionSpan(
      context,
      "profile",
      "banking.update",
      async () => {
        const requestId = await createProfileUpdateRequest({
          organizationId,
          employeeId,
          userId,
          section: "banking",
          requestedChanges: {
            bankCode: parsed.data.bankCode ?? currentProfile.bankCode,
            bankAccountHolderName:
              parsed.data.bankAccountHolderName ??
              currentProfile.bankAccountHolderName,
            bankAccountTokenized:
              parsed.data.bankAccountTokenized ??
              currentProfile.bankAccountTokenized,
          },
        })

        after(() =>
          writeIamAuditEventFromNextHeaders({
            action: HRM_ESS_AUDIT.profileUpdate.request,
            actorUserId: userId,
            actorSessionId: context.portal.sessionId,
            organizationId,
            resourceType: "hrm_ess_profile_update_request",
            resourceId: requestId,
            metadata: { surface: "employee_portal", section: "banking", employeeId },
          })
        )
        after(() =>
          notifyEssRequestLifecycle({
            organizationId,
            targetUserId: userId,
            kind: "profile_update",
            status: "submitted",
            requestId,
            employeeId,
          })
        )

        revalidatePortalProfile()
        return { ok: true }
      }
    )
  } catch (err) {
    return hrmActionFailure({
      form: err instanceof Error ? err.message : "Unable to update banking.",
    })
  }
}
