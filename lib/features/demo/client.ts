/** Client-safe demo door — paths and types only (no server-only graph). */
export { DemoBanner } from "#components2/demo/demo-banner.client"

export { demoPath } from "./schemas/demo-paths.shared"

export type {
  DemoRouteManifestEntry,
  DemoRouteStatus,
  DemoRouteCategory,
} from "./schemas/demo-route-manifest.shared"
