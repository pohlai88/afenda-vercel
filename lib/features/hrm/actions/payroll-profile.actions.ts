"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import {
  ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL,
  ORG_DASHBOARD_HRM_EMPLOYEES,
} from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { upsertPayrollProfileMutation } from "../data/payroll-profile.mutations.server"
import { upsertPayrollProfileFormSchema } from "../schemas/payroll-profile.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { PayrollProfileMutationFormState } from "../types"

function revalidateHrmEmployeeSurfaces() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEES),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL),
    "page"
  )
}

export async function upsertPayrollProfileAction(
  _prev: PayrollProfileMutationFormState | undefined,
  formData: FormData
): Promise<PayrollProfileMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = upsertPayrollProfileFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    employeeId: formData.get("employeeId"),
    effectiveFrom: formData.get("effectiveFrom"),
    countryCode: formData.get("countryCode"),
    taxResidencyCountry: formData.get("taxResidencyCountry"),
    taxIdentifierType: formData.get("taxIdentifierType"),
    taxIdentifierNumber: formData.get("taxIdentifierNumber"),
    epfNumber: formData.get("epfNumber"),
    socsoNumber: formData.get("socsoNumber"),
    pcbCategory: formData.get("pcbCategory"),
    bankCode: formData.get("bankCode"),
    bankAccountTokenized: formData.get("bankAccountTokenized"),
    bankAccountHolderName: formData.get("bankAccountHolderName"),
    paySchedule: formData.get("paySchedule"),
    payCurrency: formData.get("payCurrency"),
    payrollGroupCode: formData.get("payrollGroupCode"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      effectiveFrom: fe.effectiveFrom?.[0],
      form: fe.employeeId?.[0] ?? fe.countryCode?.[0],
    })
  }

  const d = parsed.data
  const countryCode =
    d.countryCode && d.countryCode.trim().length > 0
      ? d.countryCode.trim()
      : "MY"

  const applied = await upsertPayrollProfileMutation({
    organizationId,
    employeeId: d.employeeId,
    actorUserId: userId,
    effectiveFrom: d.effectiveFrom,
    countryCode,
    taxResidencyCountry: d.taxResidencyCountry?.trim() || null,
    taxIdentifierType: d.taxIdentifierType?.trim() || null,
    taxIdentifierNumber: d.taxIdentifierNumber?.trim() || null,
    epfNumber: d.epfNumber?.trim() || null,
    socsoNumber: d.socsoNumber?.trim() || null,
    eisEligible: formData.get("eisEligible") === "1",
    pcbCategory: d.pcbCategory?.trim() || null,
    hrdfApplicable: formData.get("hrdfApplicable") === "1",
    bankCode: d.bankCode?.trim() || null,
    bankAccountTokenized: d.bankAccountTokenized?.trim() || null,
    bankAccountHolderName: d.bankAccountHolderName?.trim() || null,
    paySchedule: d.paySchedule ?? "monthly",
    payCurrency:
      d.payCurrency && d.payCurrency.trim().length > 0
        ? d.payCurrency.trim()
        : "MYR",
    payrollGroupCode: d.payrollGroupCode?.trim() || null,
  })

  if (!applied.ok) {
    return hrmActionFailure({ form: applied.message })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.payroll_profile.upsert",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_payroll_profile",
      resourceId: applied.profileId,
      metadata: {
        employeeId: d.employeeId,
        hasTaxIdentifier: Boolean(d.taxIdentifierNumber?.trim()),
        hasBankToken: Boolean(d.bankAccountTokenized?.trim()),
      },
    })
  )

  revalidateHrmEmployeeSurfaces()
  return { ok: true }
}
