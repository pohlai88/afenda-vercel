import { composeDemoRoutePage } from "./demo-route-page-compose.server"
import { INVENTORY_STOCK_MOVEMENT_DEMO_GUIDE } from "../data/guides/inventory-stock-movement-guide.shared"
import { generateDemoRouteMetadata } from "../data/demo-route-metadata.server"

import { DemoInventoryStockMovementReadOnlySurface } from "./demo-inventory-stock-movement-readonly-surface.server"

export async function generateDemoInventoryStockMovementMetadata() {
  return generateDemoRouteMetadata(
    "inventory/stock-movement",
    "inventoryMovementPageDescription"
  )
}

export default async function DemoInventoryStockMovementPage() {
  return composeDemoRoutePage({
    slug: "inventory/stock-movement",
    descriptionKey: "inventoryMovementPageDescription",
    guide: INVENTORY_STOCK_MOVEMENT_DEMO_GUIDE,
    mirrorsFallback: "/o/{orgSlug}/apps/inventory/stock-movements",
    main: <DemoInventoryStockMovementReadOnlySurface />,
  })
}
