import type { DemoGuideContent } from "../../schemas/demo-guide.shared"

export const INVENTORY_STOCK_MOVEMENT_DEMO_GUIDE = {
  title: "How to use Stock Movements",
  purpose:
    "Warehouse operators record receipts, issues, and transfers so on-hand balances stay aligned with physical stock and audit evidence.",
  steps: [
    {
      title: "Choose movement type",
      description:
        "Receipt increases on-hand quantity; issue consumes stock; transfer moves quantity between warehouses.",
    },
    {
      title: "Validate SKU and quantity",
      description:
        "Each line references a SKU, signed quantity, and warehouse context.",
    },
    {
      title: "Reconcile exceptions",
      description:
        "Production surfaces highlight negative availability and pending reservations before posting.",
    },
  ],
  productionActions: [
    "Post stock movement",
    "Reserve inventory for orders",
    "Run balance reconciliation",
  ],
  demoLimitations: [
    "Inventory ERP page is coming soon — fixture table previews the governed list pattern.",
    "Read-only — no posting from the showcase.",
  ],
} as const satisfies DemoGuideContent
