import type { HrmPayrollProfileStub } from "./payroll-rule-pack.server"

/** DB row shape needed to build a rule-pack profile stub. */
export type PayrollProfileStubSource = {
  readonly countryCode: string
  readonly taxIdentifierNumber?: string | null
  readonly epfNumber?: string | null
  readonly socsoNumber?: string | null
  readonly payCurrency?: string | null
  readonly taxResidencyCountry?: string | null
}

/** Maps payroll profile columns to rule-pack validation input (HRM-MCP-015). */
export function toHrmPayrollProfileStub(
  row: PayrollProfileStubSource
): HrmPayrollProfileStub {
  return {
    countryCode: row.countryCode.trim() || "MY",
    taxIdentifierNumber: row.taxIdentifierNumber ?? null,
    epfNumber: row.epfNumber ?? null,
    socsoNumber: row.socsoNumber ?? null,
    payCurrency: row.payCurrency ?? null,
    taxResidencyCountry: row.taxResidencyCountry ?? null,
  }
}
