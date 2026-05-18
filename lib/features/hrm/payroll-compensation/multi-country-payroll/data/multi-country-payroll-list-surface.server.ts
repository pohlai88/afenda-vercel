import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { CountryPayrollConfigSummary } from "./country-payroll-config.server"
import type { CrossCountryPayrollReportRow } from "./cross-country-payroll-report.queries.server"

const PAYROLL_READ_PERMISSION = {
  module: "hrm" as const,
  object: "payroll" as const,
  function: "search" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function formatDateOnly(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "-"
}

type CountryConfigListCopy = {
  readonly empty: string
  readonly colCountry: string
  readonly colVersion: string
  readonly colCurrency: string
  readonly colStatutory: string
  readonly colEffectiveFrom: string
}

export function buildCountryPayrollConfigListSurfaceConfiguration(
  configs: readonly CountryPayrollConfigSummary[],
  copy: CountryConfigListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: PAYROLL_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-country-payroll-config" },
      columnsId: "hrm-country-payroll-config",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "country", header: copy.colCountry },
      { id: "version", header: copy.colVersion },
      {
        id: "currency",
        header: copy.colCurrency,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "statutory", header: copy.colStatutory, align: "end" },
      {
        id: "effectiveFrom",
        header: copy.colEffectiveFrom,
        cellKind: { kind: "date" },
      },
    ],
    rows: configs.map((config) => ({
      id: `${config.countryCode}:${config.version}`,
      cells: {
        country: config.countryCode,
        version: config.version,
        currency: config.defaultCurrency,
        statutory: config.statutoryPackTypes.length,
        effectiveFrom: formatDateOnly(config.effectiveFrom),
      },
    })),
  }
}

type CrossCountryReportListCopy = {
  readonly empty: string
  readonly colCountry: string
  readonly colLegalEntity: string
  readonly colPeriod: string
  readonly colPayGroup: string
  readonly colCurrency: string
  readonly colRuns: string
  readonly colGrossPay: string
  readonly colNetPay: string
  readonly colEmployerCost: string
  readonly colEmployerCostReporting: string
}

export function buildCrossCountryPayrollReportListSurfaceConfiguration(
  rows: readonly CrossCountryPayrollReportRow[],
  copy: CrossCountryReportListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: PAYROLL_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-cross-country-payroll-report" },
      columnsId: "hrm-cross-country-payroll-report",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "country", header: copy.colCountry },
      { id: "legalEntity", header: copy.colLegalEntity },
      { id: "period", header: copy.colPeriod },
      { id: "payGroup", header: copy.colPayGroup },
      {
        id: "currency",
        header: copy.colCurrency,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "runs", header: copy.colRuns, align: "end" },
      { id: "grossPay", header: copy.colGrossPay, align: "end" },
      { id: "netPay", header: copy.colNetPay, align: "end" },
      { id: "employerCost", header: copy.colEmployerCost, align: "end" },
      {
        id: "employerCostReporting",
        header: copy.colEmployerCostReporting,
        align: "end",
      },
    ],
    rows: rows.map((row) => ({
      id: `${row.periodId}:${row.countryCode}:${row.legalEntityCode}:${row.payCurrency}:${row.payrollGroupCode}`,
      cells: {
        country: row.countryCode,
        legalEntity: row.legalEntityCode,
        period: `${row.periodStart} - ${row.periodEnd}`,
        payGroup: row.payrollGroupCode,
        currency: row.payCurrency,
        runs: row.runCount,
        grossPay: `${row.payCurrency} ${row.grossPay}`,
        netPay: `${row.payCurrency} ${row.netPay}`,
        employerCost: `${row.payCurrency} ${row.employerCost}`,
        employerCostReporting:
          row.reportingCurrency && row.employerCostReporting
            ? `${row.reportingCurrency} ${row.employerCostReporting}`
            : "-",
      },
    })),
  }
}
