import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile } from "#lib/db/schema"

import type { PayrollProfileCurrentRow } from "../types"

export async function getCurrentPayrollProfileForEmployee(
  organizationId: string,
  employeeId: string
): Promise<PayrollProfileCurrentRow | null> {
  const [row] = await db
    .select({
      id: hrmPayrollProfile.id,
      countryCode: hrmPayrollProfile.countryCode,
      taxResidencyCountry: hrmPayrollProfile.taxResidencyCountry,
      taxIdentifierType: hrmPayrollProfile.taxIdentifierType,
      taxIdentifierNumber: hrmPayrollProfile.taxIdentifierNumber,
      epfNumber: hrmPayrollProfile.epfNumber,
      socsoNumber: hrmPayrollProfile.socsoNumber,
      eisEligible: hrmPayrollProfile.eisEligible,
      pcbCategory: hrmPayrollProfile.pcbCategory,
      hrdfApplicable: hrmPayrollProfile.hrdfApplicable,
      bankCode: hrmPayrollProfile.bankCode,
      bankAccountTokenized: hrmPayrollProfile.bankAccountTokenized,
      bankAccountHolderName: hrmPayrollProfile.bankAccountHolderName,
      paySchedule: hrmPayrollProfile.paySchedule,
      payCurrency: hrmPayrollProfile.payCurrency,
      payrollGroupCode: hrmPayrollProfile.payrollGroupCode,
      effectiveFrom: hrmPayrollProfile.effectiveFrom,
      statutoryProfileExtras: hrmPayrollProfile.statutoryProfileExtras,
    })
    .from(hrmPayrollProfile)
    .where(
      and(
        eq(hrmPayrollProfile.organizationId, organizationId),
        eq(hrmPayrollProfile.employeeId, employeeId),
        isNull(hrmPayrollProfile.effectiveTo)
      )
    )
    .limit(1)

  return row ?? null
}
