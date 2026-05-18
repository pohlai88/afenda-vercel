import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollLegalEntityConfig } from "#lib/db/schema"

export type LegalEntityPayrollConfigRow = {
  readonly id: string
  readonly legalEntityCode: string
  readonly countryCode: string
  readonly registrationNumber: string | null
  readonly defaultPayrollCurrency: string
  readonly payrollCountryCode: string
  readonly isActive: boolean
}

export async function listLegalEntityPayrollConfigs(
  organizationId: string,
  opts?: { readonly countryCode?: string; readonly activeOnly?: boolean }
): Promise<LegalEntityPayrollConfigRow[]> {
  const conditions = [
    eq(hrmPayrollLegalEntityConfig.organizationId, organizationId),
  ]
  if (opts?.countryCode) {
    conditions.push(
      eq(
        hrmPayrollLegalEntityConfig.countryCode,
        opts.countryCode.toUpperCase()
      )
    )
  }
  if (opts?.activeOnly !== false) {
    conditions.push(eq(hrmPayrollLegalEntityConfig.isActive, true))
  }

  const rows = await db
    .select({
      id: hrmPayrollLegalEntityConfig.id,
      legalEntityCode: hrmPayrollLegalEntityConfig.legalEntityCode,
      countryCode: hrmPayrollLegalEntityConfig.countryCode,
      registrationNumber: hrmPayrollLegalEntityConfig.registrationNumber,
      defaultPayrollCurrency:
        hrmPayrollLegalEntityConfig.defaultPayrollCurrency,
      payrollCountryCode: hrmPayrollLegalEntityConfig.payrollCountryCode,
      isActive: hrmPayrollLegalEntityConfig.isActive,
    })
    .from(hrmPayrollLegalEntityConfig)
    .where(and(...conditions))
    .orderBy(
      asc(hrmPayrollLegalEntityConfig.countryCode),
      asc(hrmPayrollLegalEntityConfig.legalEntityCode)
    )

  return rows
}

export async function getLegalEntityPayrollConfig(
  organizationId: string,
  legalEntityCode: string
): Promise<LegalEntityPayrollConfigRow | null> {
  const rows = await db
    .select({
      id: hrmPayrollLegalEntityConfig.id,
      legalEntityCode: hrmPayrollLegalEntityConfig.legalEntityCode,
      countryCode: hrmPayrollLegalEntityConfig.countryCode,
      registrationNumber: hrmPayrollLegalEntityConfig.registrationNumber,
      defaultPayrollCurrency:
        hrmPayrollLegalEntityConfig.defaultPayrollCurrency,
      payrollCountryCode: hrmPayrollLegalEntityConfig.payrollCountryCode,
      isActive: hrmPayrollLegalEntityConfig.isActive,
    })
    .from(hrmPayrollLegalEntityConfig)
    .where(
      and(
        eq(hrmPayrollLegalEntityConfig.organizationId, organizationId),
        eq(hrmPayrollLegalEntityConfig.legalEntityCode, legalEntityCode)
      )
    )
    .limit(1)

  return rows[0] ?? null
}
