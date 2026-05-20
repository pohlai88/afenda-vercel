import "server-only"

import {
  assertGovernedSurfaceInput,
  listSurfaceRendererConfigurationSchema,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

export type DemoStockMovementRow = {
  id: string
  documentNumber: string
  sku: string
  movementType: string
  quantity: string
  warehouse: string
}

const DEMO_STOCK_MOVEMENT_ROWS = [
  {
    id: "demo-mv-001",
    documentNumber: "SM-2026-0088",
    sku: "SKU-LAMP-220V",
    movementType: "Receipt",
    quantity: "+120",
    warehouse: "WH-EAST",
  },
  {
    id: "demo-mv-002",
    documentNumber: "SM-2026-0087",
    sku: "SKU-CABLE-CAT6",
    movementType: "Issue",
    quantity: "-40",
    warehouse: "WH-EAST",
  },
  {
    id: "demo-mv-003",
    documentNumber: "SM-2026-0084",
    sku: "SKU-PALLET-STD",
    movementType: "Transfer",
    quantity: "25",
    warehouse: "WH-WEST",
  },
] as const satisfies readonly DemoStockMovementRow[]

export function getDemoStockMovementFixture(): readonly DemoStockMovementRow[] {
  return DEMO_STOCK_MOVEMENT_ROWS
}

export function buildDemoStockMovementListConfiguration(
  rows: readonly DemoStockMovementRow[],
  copy: { empty: string }
): ListSurfaceRendererConfigurationInput {
  return assertGovernedSurfaceInput(
    listSurfaceRendererConfigurationSchema,
    {
      dataNature: "table",
      presentation: { variant: "table-only", tableDensity: "comfortable" },
      surface: {
        header: { title: "demo-inventory-movements" },
        columnsId: "demo-inventory-movements",
        rowKey: "id",
        empty: {
          variant: "muted",
          title: copy.empty,
        },
      },
      columns: [
        { id: "document", header: "Document" },
        { id: "sku", header: "SKU" },
        { id: "type", header: "Type" },
        { id: "qty", header: "Qty", align: "end" },
        { id: "warehouse", header: "Warehouse" },
      ],
      rows: rows.map((row) => ({
        id: row.id,
        cells: {
          document: row.documentNumber,
          sku: row.sku,
          type: row.movementType,
          qty: row.quantity,
          warehouse: row.warehouse,
        },
      })),
    },
    "demo:inventory:stock-movements"
  )
}
