import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { PayrollCloseChecklistItem } from "./payroll-close.shared"

const PAYROLL_READ_PERMISSION = {
  module: "hrm" as const,
  object: "payroll" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type PayrollCloseChecklistListCopy = {
  empty: string
  colItem: string
  colStatus: string
  statusLabelFor: (status: PayrollCloseChecklistItem["status"]) => string
}

export function buildPayrollCloseChecklistListSurfaceConfiguration(
  items: readonly PayrollCloseChecklistItem[],
  copy: PayrollCloseChecklistListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: PAYROLL_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-payroll-close-checklist" },
      columnsId: "hrm-payroll-close-checklist",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "item", header: copy.colItem },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: items.map((item) => ({
      id: item.id,
      cells: {
        item: `${item.label} — ${item.detail}`,
        status: copy.statusLabelFor(item.status),
      },
    })),
  }
}
