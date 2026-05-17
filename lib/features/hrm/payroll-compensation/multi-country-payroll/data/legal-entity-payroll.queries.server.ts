import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile } from "#lib/db/schema"

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
  const conditions = [eq(hrmPayrollProfile.organizationId, organizationId)]
  if (opts?.countryCode) {
    conditions.push(eq(hrmPayrollProfile.countryCode, opts.countryCode))
  }

  const rows = await db
    .select({
      countryCode: hrmPayrollProfile.countryCode,
      payCurrency: hrmPayrollProfile.payCurrency,
    })
    .from(hrmPayrollProfile)
    .where(and(...conditions))

  const unique = new Map<string, LegalEntityPayrollConfigRow>()
  for (const row of rows) {
    const countryCode = row.countryCode.toUpperCase()
    const legalEntityCode = countryCode
    if (unique.has(legalEntityCode)) continue
    unique.set(legalEntityCode, {
      id: legalEntityCode,
      legalEntityCode,
      countryCode,
      registrationNumber: null,
      defaultPayrollCurrency: row.payCurrency.toUpperCase(),
      payrollCountryCode: countryCode,
      isActive: true,
    })
  }

  return [...unique.values()]
}

export async function getLegalEntityPayrollConfig(
  organizationId: string,
  legalEntityCode: string
): Promise<LegalEntityPayrollConfigRow | null> {
  const rows = await listLegalEntityPayrollConfigs(organizationId, {
    activeOnly: false,
  })
  return rows.find((r) => r.legalEntityCode === legalEntityCode) ?? null
}
