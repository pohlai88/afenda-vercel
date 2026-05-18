import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { PayrollConsoleRun } from "./payroll-console-view.shared"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type PayrollRunListCopy = {
  empty: string
  colEmployee: string
  colState: string
  colGrossPay: string
  colNetPay: string
  colEmployerCost: string
  stateLabelFor: (state: string) => string
  issuesLabel: (count: number) => string
}

export function buildPayrollRunListSurfaceConfiguration(
  runs: readonly PayrollConsoleRun[],
  copy: PayrollRunListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-payroll-runs" },
      columnsId: "hrm-payroll-runs",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "grossPay",
        header: copy.colGrossPay,
        align: "end",
      },
      {
        id: "netPay",
        header: copy.colNetPay,
        align: "end",
      },
      {
        id: "employerCost",
        header: copy.colEmployerCost,
        align: "end",
      },
    ],
    rows: runs.map((run) => {
      const issueSuffix =
        run.validationIssues.length > 0
          ? ` · ${copy.issuesLabel(run.validationIssues.length)}`
          : ""
      return {
        id: run.id,
        cells: {
          employee: `${run.employeeLegalName} (${run.employeeNumber})`,
          state: `${copy.stateLabelFor(run.state)}${issueSuffix}`,
          grossPay: run.grossPay,
          netPay: run.netPay,
          employerCost: run.employerCost,
        },
      }
    }),
  }
}
