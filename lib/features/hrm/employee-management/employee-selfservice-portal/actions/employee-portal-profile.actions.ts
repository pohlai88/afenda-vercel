"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import {
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmployeeContactProfile,
  hrmEmployeePersonalProfile,
} from "#lib/db/schema"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { toLocalePortalRevalidatePattern } from "#lib/portal"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { withEmployeePortalActionSpan } from "../data/portal-mutation-tracing.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"
import { getCurrentPayrollProfileForEmployee } from "../../../payroll-compensation/payroll-processing/data/payroll-profile.queries.server"
import { upsertPayrollProfileMutation } from "../../../payroll-compensation/payroll-processing/data/payroll-profile.mutations.server"
import {
  portalBankingProfileFormSchema,
  portalEmergencyContactFormSchema,
  portalPersonalProfileFormSchema,
} from "../schemas/employee-portal-profile.schema"
import { hrmActionFailure } from "../../../hrm-action-result.shared"
import type { EmployeeMasterMutationFormState } from "../../../types"

function revalidatePortalProfile() {
  revalidatePath(toLocalePortalRevalidatePattern("/employee/profile"), "page")
}

function optionalDate(value: string | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null
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
        await db.transaction(async (tx) => {
          const [employee] = await tx
            .select({ id: hrmEmployee.id, archivedAt: hrmEmployee.archivedAt })
            .from(hrmEmployee)
            .where(
              and(
                eq(hrmEmployee.organizationId, organizationId),
                eq(hrmEmployee.id, employeeId)
              )
            )
            .limit(1)

          if (!employee || employee.archivedAt) {
            throw new Error("Employee record is not available.")
          }

          await tx
            .update(hrmEmployee)
            .set({
              preferredName: parsed.data.preferredName ?? null,
              dateOfBirth: optionalDate(parsed.data.dateOfBirth),
              gender: parsed.data.gender ?? null,
              nationality: parsed.data.nationality ?? null,
              updatedAt: new Date(),
              updatedByUserId: userId,
            })
            .where(eq(hrmEmployee.id, employeeId))

          const profileValues = {
            dateOfBirth: optionalDate(parsed.data.dateOfBirth),
            gender: parsed.data.gender ?? null,
            nationality: parsed.data.nationality ?? null,
            maritalStatus: parsed.data.maritalStatus ?? null,
            updatedAt: new Date(),
            updatedByUserId: userId,
          }

          await tx
            .insert(hrmEmployeePersonalProfile)
            .values({
              organizationId,
              employeeId,
              ...profileValues,
              createdByUserId: userId,
              updatedByUserId: userId,
            })
            .onConflictDoUpdate({
              target: [
                hrmEmployeePersonalProfile.organizationId,
                hrmEmployeePersonalProfile.employeeId,
              ],
              set: {
                ...profileValues,
              },
            })
        })

        after(() =>
          writeIamAuditEventFromNextHeaders({
            action: "erp.hrm.employee.profile.update",
            actorUserId: userId,
            actorSessionId: context.portal.sessionId,
            organizationId,
            resourceType: "hrm_employee",
            resourceId: employeeId,
            metadata: { surface: "employee_portal", section: "personal" },
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
        await db.transaction(async (tx) => {
          const [existing] = await tx
            .select({ id: hrmEmployeeContactProfile.id })
            .from(hrmEmployeeContactProfile)
            .where(
              and(
                eq(hrmEmployeeContactProfile.organizationId, organizationId),
                eq(hrmEmployeeContactProfile.employeeId, employeeId)
              )
            )
            .limit(1)

          const values = {
            personalEmail: parsed.data.personalEmail ?? null,
            personalPhone: parsed.data.personalPhone ?? null,
            address,
            updatedAt: new Date(),
            updatedByUserId: userId,
          }

          if (existing) {
            await tx
              .update(hrmEmployeeContactProfile)
              .set(values)
              .where(eq(hrmEmployeeContactProfile.id, existing.id))
          } else {
            await tx.insert(hrmEmployeeContactProfile).values({
              organizationId,
              employeeId,
              workEmail: null,
              workPhone: null,
              ...values,
              createdByUserId: userId,
            })
          }
        })

        after(() =>
          writeIamAuditEventFromNextHeaders({
            action: "erp.hrm.employee.profile.update",
            actorUserId: userId,
            actorSessionId: context.portal.sessionId,
            organizationId,
            resourceType: "hrm_employee",
            resourceId: employeeId,
            metadata: { surface: "employee_portal", section: "emergency" },
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

  const effectiveFrom = new Date().toISOString().slice(0, 10)

  try {
    return await withEmployeePortalActionSpan(
      context,
      "profile",
      "banking.update",
      async () => {
        const applied = await upsertPayrollProfileMutation({
          organizationId,
          employeeId,
          actorUserId: userId,
          effectiveFrom,
          countryCode: currentProfile.countryCode,
          taxResidencyCountry: currentProfile.taxResidencyCountry,
          taxIdentifierType: currentProfile.taxIdentifierType,
          taxIdentifierNumber: currentProfile.taxIdentifierNumber,
          epfNumber: currentProfile.epfNumber,
          socsoNumber: currentProfile.socsoNumber,
          eisEligible: currentProfile.eisEligible,
          pcbCategory: currentProfile.pcbCategory,
          hrdfApplicable: currentProfile.hrdfApplicable,
          bankCode: parsed.data.bankCode ?? currentProfile.bankCode,
          bankAccountHolderName:
            parsed.data.bankAccountHolderName ??
            currentProfile.bankAccountHolderName,
          bankAccountTokenized:
            parsed.data.bankAccountTokenized ??
            currentProfile.bankAccountTokenized,
          paySchedule: currentProfile.paySchedule,
          payCurrency: currentProfile.payCurrency,
          payrollGroupCode: currentProfile.payrollGroupCode,
        })

        if (!applied.ok) {
          return hrmActionFailure({ form: applied.message })
        }

        after(() =>
          writeIamAuditEventFromNextHeaders({
            action: "erp.hrm.employee.profile.update",
            actorUserId: userId,
            actorSessionId: context.portal.sessionId,
            organizationId,
            resourceType: "hrm_employee",
            resourceId: employeeId,
            metadata: { surface: "employee_portal", section: "banking" },
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
