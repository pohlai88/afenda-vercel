import "server-only"

import {
  assertGovernedSurfaceInput,
  listSurfaceRendererConfigurationSchema,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

export type DemoPurchaseRequestRow = {
  id: string
  requestNumber: string
  requester: string
  amount: string
  status: string
}

const DEMO_PURCHASE_REQUEST_ROWS = [
  {
    id: "demo-pr-001",
    requestNumber: "PR-2026-0142",
    requester: "Facilities — Dana Okonkwo",
    amount: "$4,280.00",
    status: "Pending approval",
  },
  {
    id: "demo-pr-002",
    requestNumber: "PR-2026-0138",
    requester: "IT — Morgan Blake",
    amount: "$12,450.00",
    status: "Approved",
  },
  {
    id: "demo-pr-003",
    requestNumber: "PR-2026-0131",
    requester: "Marketing — Riley Chen",
    amount: "$890.50",
    status: "Draft",
  },
] as const satisfies readonly DemoPurchaseRequestRow[]

export function getDemoPurchaseRequestFixture(): readonly DemoPurchaseRequestRow[] {
  return DEMO_PURCHASE_REQUEST_ROWS
}

export function buildDemoPurchaseRequestListConfiguration(
  rows: readonly DemoPurchaseRequestRow[],
  copy: { empty: string }
): ListSurfaceRendererConfigurationInput {
  return assertGovernedSurfaceInput(
    listSurfaceRendererConfigurationSchema,
    {
      dataNature: "table",
      presentation: { variant: "table-only", tableDensity: "comfortable" },
      surface: {
        header: { title: "demo-procurement-pr" },
        columnsId: "demo-procurement-pr",
        rowKey: "id",
        empty: {
          variant: "muted",
          title: copy.empty,
        },
      },
      columns: [
        { id: "number", header: "Request" },
        { id: "requester", header: "Requester" },
        { id: "amount", header: "Amount", align: "end" },
        { id: "status", header: "Status" },
      ],
      rows: rows.map((row) => ({
        id: row.id,
        cells: {
          number: row.requestNumber,
          requester: row.requester,
          amount: row.amount,
          status: row.status,
        },
      })),
    },
    "demo:procurement:purchase-requests"
  )
}
