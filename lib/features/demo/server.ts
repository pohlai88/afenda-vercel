import "server-only"

export { redirectIfDemoShowcaseDisabled } from "./data/demo-route-gate.server"
export { DEMO_ROUTE_MANIFEST } from "./schemas/demo-route-manifest.shared"
export { demoPath } from "./schemas/demo-paths.shared"
export { generateDemoRouteMetadata } from "./data/demo-route-metadata.server"

export {
  generateDemoShowcaseMetadata,
  default as DemoShowcaseIndexPage,
} from "./components/demo-showcase-index-page.server"

export {
  generateDemoEmployeeLeaveMetadata,
  default as DemoEmployeeLeavePage,
} from "./components/demo-employee-leave-page.server"

export {
  generateDemoEmployeeRecordsMetadata,
  default as DemoEmployeeRecordsPage,
} from "./components/demo-employee-records-page.server"

export {
  generateDemoProcurementPurchaseRequestMetadata,
  default as DemoProcurementPurchaseRequestPage,
} from "./components/demo-procurement-purchase-request-page.server"

export {
  generateDemoInventoryStockMovementMetadata,
  default as DemoInventoryStockMovementPage,
} from "./components/demo-inventory-stock-movement-page.server"

export {
  generateDemoWorkbenchShellMetadata,
  default as DemoWorkbenchShellPage,
} from "./components/demo-workbench-shell-page.server"
