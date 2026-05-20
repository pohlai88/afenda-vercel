import { composeDemoRoutePage } from "./demo-route-page-compose.server"
import { PROCUREMENT_PURCHASE_REQUEST_DEMO_GUIDE } from "../data/guides/procurement-purchase-request-guide.shared"
import { generateDemoRouteMetadata } from "../data/demo-route-metadata.server"

import { DemoProcurementPurchaseRequestReadOnlySurface } from "./demo-procurement-pr-readonly-surface.server"

export async function generateDemoProcurementPurchaseRequestMetadata() {
  return generateDemoRouteMetadata(
    "procurement/purchase-request",
    "procurementPrPageDescription"
  )
}

export default async function DemoProcurementPurchaseRequestPage() {
  return composeDemoRoutePage({
    slug: "procurement/purchase-request",
    descriptionKey: "procurementPrPageDescription",
    guide: PROCUREMENT_PURCHASE_REQUEST_DEMO_GUIDE,
    mirrorsFallback: "/o/{orgSlug}/apps/procurement/purchase-requests",
    main: <DemoProcurementPurchaseRequestReadOnlySurface />,
  })
}
