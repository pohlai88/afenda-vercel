import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface"
import {
  buildCountryPayrollConfigListSurfaceConfiguration,
  buildCrossCountryPayrollReportListSurfaceConfiguration,
} from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/multi-country-payroll-list-surface.server"
import type { CountryPayrollConfigSummary } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/country-payroll-config.server"
import type { CrossCountryPayrollReportRow } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/cross-country-payroll-report.queries.server"
import { readPayrollProfileLegalEntityCode } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/payroll-profile-legal-entity.shared"
import { legalEntityPayrollConfigSchema } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/schemas/legal-entity-payroll.schema"
import { payComponentTreatmentSchema } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/schemas/pay-component-treatment.schema"

describe("multi-country payroll metadata", () => {
  it("builds a governed country-config list surface", () => {
    const configs = [
      {
        countryCode: "MY",
        version: "MY-2026-01",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
        defaultCurrency: "MYR",
        statutoryPackTypes: ["epf_monthly", "pcb_monthly"],
        manifest: {
          epfVersion: "MY-EPF-2025-10",
          socsoVersion: "MY-SOCSO-2024-10",
          eisVersion: "MY-EIS-2024-10",
          pcbVersion: "MY-PCB-2026-01",
          hrdfVersion: null,
          holidayVersion: "MY-HOLIDAY-2026",
          eaLeaveVersion: "MY-EA-2023-01",
        },
      },
    ] as const satisfies readonly CountryPayrollConfigSummary[]

    const config = buildCountryPayrollConfigListSurfaceConfiguration(configs, {
      empty: "No configs",
      colCountry: "Country",
      colVersion: "Rule pack",
      colCurrency: "Currency",
      colStatutory: "Statutory packs",
      colEffectiveFrom: "Effective from",
    })
    const parsed = parseListSurfaceRendererConfiguration(config)

    expect(parsed.success).toBe(true)
    expect(config.dataNature).toBe("table")
    expect(config.requiresErpPermission).toMatchObject({
      module: "hrm",
      object: "payroll",
      function: "search",
    })
    expect(config.rows[0]?.cells).toMatchObject({
      country: "MY",
      currency: "MYR",
      statutory: 2,
    })
  })

  it("builds a governed cross-country report list surface", () => {
    const rows = [
      {
        countryCode: "SG",
        legalEntityCode: "SG01",
        payCurrency: "SGD",
        payrollGroupCode: "SG-MONTHLY",
        periodId: "period-sg-2026-03",
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        runCount: 3,
        grossPay: "12000.00",
        netPay: "9800.00",
        employerCost: "13500.00",
        reportingCurrency: "USD",
        grossPayReporting: "8880.00",
        employerCostReporting: "9990.00",
      },
    ] as const satisfies readonly CrossCountryPayrollReportRow[]

    const config = buildCrossCountryPayrollReportListSurfaceConfiguration(
      rows,
      {
        empty: "No report rows",
        colCountry: "Country",
        colLegalEntity: "Legal entity",
        colPeriod: "Period",
        colPayGroup: "Pay group",
        colCurrency: "Currency",
        colRuns: "Runs",
        colGrossPay: "Gross pay",
        colNetPay: "Net pay",
        colEmployerCost: "Employer cost",
        colEmployerCostReporting: "Employer cost reporting",
      }
    )
    const parsed = parseListSurfaceRendererConfiguration(config)

    expect(parsed.success).toBe(true)
    expect(config.rows[0]?.cells).toMatchObject({
      country: "SG",
      legalEntity: "SG01",
      payGroup: "SG-MONTHLY",
      employerCostReporting: "USD 9990.00",
    })
  })

  it("normalizes country, currency, and treatment codes at schema boundaries", () => {
    const legalEntity = legalEntityPayrollConfigSchema.parse({
      legalEntityCode: "MY01",
      countryCode: "my",
      registrationNumber: " 20260101 ",
      defaultPayrollCurrency: "myr",
      payrollCountryCode: "my",
      isActive: true,
    })
    const treatment = payComponentTreatmentSchema.parse({
      countryCode: "sg",
      componentCode: "cpf_ee",
      taxable: false,
      contributable: false,
      pensionable: false,
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
    })

    expect(legalEntity).toMatchObject({
      countryCode: "MY",
      defaultPayrollCurrency: "MYR",
      payrollCountryCode: "MY",
      registrationNumber: "20260101",
    })
    expect(treatment).toMatchObject({
      countryCode: "SG",
      componentCode: "CPF_EE",
    })
    expect(
      payComponentTreatmentSchema.safeParse({
        countryCode: "MY",
        componentCode: "BASIC",
        taxable: true,
        contributable: true,
        pensionable: true,
        effectiveFrom: "2026-02-01",
        effectiveTo: "2026-01-31",
      }).success
    ).toBe(false)
  })

  it("reads legal entity code from payroll profile extras without leaking JSON shape", () => {
    expect(
      readPayrollProfileLegalEntityCode({ legalEntityCode: " MY-HQ " })
    ).toBe("MY-HQ")
    expect(
      readPayrollProfileLegalEntityCode({ legalEntityCode: "" })
    ).toBeNull()
    expect(readPayrollProfileLegalEntityCode(null)).toBeNull()
  })
})
