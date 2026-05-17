import type {
  ListSurfaceRendererConfigurationInput,
  StatCardConfigurationInput,
} from "#features/governed-surface"
import type { PayrollPayslipSnapshot } from "#features/hrm/client"
import { employeePortalPath } from "#lib/portal"

import { HRM_METADATA_PREVIEW_PORTAL_SLUG } from "../fixtures/preview-href.shared"

/** Dev-only copy aligned with `messages/en.json` → Dashboard.Hrm.payroll payslip keys. */
export const DEV_PAYSLIP_COPY = {
  listTitle: "My payslips",
  listDescription:
    "Review immutable payroll snapshots published for your employee record.",
  listEmpty: "No payslips are available yet.",
  colTitle: "Document",
  colPeriod: "Period end",
  colPaymentDate: "Payment",
  colNetPay: "Net pay",
  colGrossPay: "Gross pay",
  colGenerated: "Generated",
  detailLinesTitle: "Payroll lines",
  detailSummaryGross: "Gross pay",
  detailSummaryNet: "Net pay",
  detailSummaryEmployerCost: "Employer cost",
  detailSummaryDeductions: "Employee deductions",
  lineKind: "Kind",
  lineCode: "Code",
  lineDescription: "Description",
  lineAmount: "Amount",
} as const

export type DevPayslipListRow = {
  readonly id: string
  readonly title: string
  readonly periodEndLabel: string
  readonly paymentDateLabel: string
  readonly netPayLabel: string
  readonly grossPayLabel: string
  readonly generatedAtLabel: string
}

const MOCK_PAYSLIP_SNAPSHOT = {
  runId: "00000000-0000-4000-8000-000000000101",
  periodId: "00000000-0000-4000-8000-000000000201",
  employeeId: "00000000-0000-4000-8000-000000000301",
  employeeNumber: "E001",
  employeeLegalName: "Jane Doe",
  periodStart: "2026-03-01",
  periodEnd: "2026-03-31",
  paymentDate: "2026-03-31",
  currency: "MYR",
  rulePackVersion: "MY-2026-01",
  grossPay: "5000.00",
  netPay: "4302.90",
  employerCost: "5690.85",
  inputDigest: "dev-payslip-digest",
  inputHash: "dev-payslip-hash",
  generatedAt: "2026-04-01T08:15:00.000Z",
  lines: [
    {
      lineKind: "earning",
      code: "BASIC",
      description: "Basic salary",
      amount: "5000.00",
      rulePackProvenance: null,
    },
    {
      lineKind: "employee_deduction",
      code: "EPF_EMPLOYEE",
      description: "EPF employee contribution (11%)",
      amount: "-550.00",
      rulePackProvenance: null,
    },
    {
      lineKind: "employee_deduction",
      code: "SOCSO_EMPLOYEE",
      description: "SOCSO employee contribution",
      amount: "-24.10",
      rulePackProvenance: null,
    },
    {
      lineKind: "employee_deduction",
      code: "EIS_EMPLOYEE",
      description: "EIS employee contribution (0.2%)",
      amount: "-10.00",
      rulePackProvenance: null,
    },
    {
      lineKind: "employee_deduction",
      code: "PCB",
      description: "Monthly tax deduction (PCB)",
      amount: "-113.00",
      rulePackProvenance: null,
    },
    {
      lineKind: "employer_contribution",
      code: "EPF_EMPLOYER",
      description: "EPF employer contribution (13%)",
      amount: "650.00",
      rulePackProvenance: null,
    },
    {
      lineKind: "employer_contribution",
      code: "SOCSO_EMPLOYER",
      description: "SOCSO employer contribution",
      amount: "50.85",
      rulePackProvenance: null,
    },
    {
      lineKind: "employer_contribution",
      code: "EIS_EMPLOYER",
      description: "EIS employer contribution (0.2%)",
      amount: "10.00",
      rulePackProvenance: null,
    },
    {
      lineKind: "employer_contribution",
      code: "HRDF",
      description: "HRDF levy (0.5%)",
      amount: "25.00",
      rulePackProvenance: null,
    },
  ],
} as const satisfies PayrollPayslipSnapshot

export const DEV_PAYSLIP_LIST_ROWS: readonly DevPayslipListRow[] = [
  {
    id: "doc-payslip-mar-2026",
    title: "Payslip — Mar 2026",
    periodEndLabel: "Mar 31, 2026",
    paymentDateLabel: "Mar 31, 2026",
    netPayLabel: "4,302.90 MYR",
    grossPayLabel: "5,000.00 MYR",
    generatedAtLabel: "Apr 1, 2026, 8:15 AM",
  },
  {
    id: "doc-payslip-feb-2026",
    title: "Payslip — Feb 2026",
    periodEndLabel: "Feb 28, 2026",
    paymentDateLabel: "Feb 28, 2026",
    netPayLabel: "4,302.90 MYR",
    grossPayLabel: "5,000.00 MYR",
    generatedAtLabel: "Mar 1, 2026, 8:12 AM",
  },
] as const

function formatLineKind(lineKind: string): string {
  return lineKind.replaceAll("_", " ")
}

function employeeDeductionsTotal(snapshot: PayrollPayslipSnapshot): string {
  const total = snapshot.lines
    .filter((line) => line.lineKind === "employee_deduction")
    .reduce((sum, line) => sum + Math.abs(Number.parseFloat(line.amount)), 0)
  return total.toFixed(2)
}

export function buildDevPayslipsListSurfaceConfiguration(
  rows: readonly DevPayslipListRow[],
  portalSlug: string = HRM_METADATA_PREVIEW_PORTAL_SLUG
): ListSurfaceRendererConfigurationInput {
  return {
    surface: {
      header: {
        eyebrow: DEV_PAYSLIP_COPY.listTitle,
        title: DEV_PAYSLIP_COPY.listTitle,
        description: DEV_PAYSLIP_COPY.listDescription,
      },
      columnsId: "ess-payslips",
      rowKey: "id",
      empty: { variant: "muted", title: DEV_PAYSLIP_COPY.listEmpty },
    },
    columns: [
      { id: "title", header: DEV_PAYSLIP_COPY.colTitle },
      { id: "period", header: DEV_PAYSLIP_COPY.colPeriod },
      { id: "paymentDate", header: DEV_PAYSLIP_COPY.colPaymentDate },
      { id: "netPay", header: DEV_PAYSLIP_COPY.colNetPay, align: "end" },
      { id: "grossPay", header: DEV_PAYSLIP_COPY.colGrossPay, align: "end" },
      { id: "generatedAt", header: DEV_PAYSLIP_COPY.colGenerated },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      linkColumnId: "title",
      rowHref: `${employeePortalPath(portalSlug, "payslips")}/${row.id}`,
      cells: {
        title: row.title,
        period: row.periodEndLabel,
        paymentDate: row.paymentDateLabel,
        netPay: row.netPayLabel,
        grossPay: row.grossPayLabel,
        generatedAt: row.generatedAtLabel,
      },
    })),
  }
}

export function buildDevPayslipSummaryStatConfiguration(
  snapshot: PayrollPayslipSnapshot = MOCK_PAYSLIP_SNAPSHOT
): StatCardConfigurationInput {
  const periodLabel = `${snapshot.periodStart} – ${snapshot.periodEnd}`
  const deductions = employeeDeductionsTotal(snapshot)

  return {
    stats: [
      {
        label: DEV_PAYSLIP_COPY.detailSummaryGross,
        value: `${snapshot.grossPay} ${snapshot.currency}`,
        delta: periodLabel,
        tone: "default",
      },
      {
        label: DEV_PAYSLIP_COPY.detailSummaryDeductions,
        value: `−${deductions} ${snapshot.currency}`,
        delta: "EPF + SOCSO + EIS + PCB",
        tone: "attention",
      },
      {
        label: DEV_PAYSLIP_COPY.detailSummaryNet,
        value: `${snapshot.netPay} ${snapshot.currency}`,
        delta: `Payment ${snapshot.paymentDate}`,
        tone: "positive",
      },
      {
        label: DEV_PAYSLIP_COPY.detailSummaryEmployerCost,
        value: `${snapshot.employerCost} ${snapshot.currency}`,
        delta: snapshot.rulePackVersion ?? "—",
        tone: "default",
      },
    ],
  }
}

export function buildDevPayslipLinesListSurfaceConfiguration(
  snapshot: PayrollPayslipSnapshot = MOCK_PAYSLIP_SNAPSHOT
): ListSurfaceRendererConfigurationInput {
  return {
    surface: {
      header: {
        eyebrow: `Payslip — ${snapshot.periodEnd}`,
        title: DEV_PAYSLIP_COPY.detailLinesTitle,
        description: `${snapshot.employeeLegalName} · ${snapshot.employeeNumber}`,
      },
      columnsId: "ess-payslip-lines",
      rowKey: "id",
      empty: { variant: "muted", title: "No lines in this payslip." },
    },
    columns: [
      { id: "kind", header: DEV_PAYSLIP_COPY.lineKind },
      { id: "code", header: DEV_PAYSLIP_COPY.lineCode },
      { id: "description", header: DEV_PAYSLIP_COPY.lineDescription },
      { id: "amount", header: DEV_PAYSLIP_COPY.lineAmount, align: "end" },
    ],
    rows: snapshot.lines.map((line, index) => ({
      id: `${line.code}-${index}`,
      cells: {
        kind: formatLineKind(line.lineKind),
        code: line.code,
        description: line.description,
        amount: `${line.amount} ${snapshot.currency}`,
      },
    })),
  }
}

export const DEV_PAYSLIP_LIST_SURFACE =
  buildDevPayslipsListSurfaceConfiguration(DEV_PAYSLIP_LIST_ROWS)

export const DEV_PAYSLIP_SUMMARY_STATS =
  buildDevPayslipSummaryStatConfiguration(MOCK_PAYSLIP_SNAPSHOT)

export const DEV_PAYSLIP_LINES_SURFACE =
  buildDevPayslipLinesListSurfaceConfiguration(MOCK_PAYSLIP_SNAPSHOT)
