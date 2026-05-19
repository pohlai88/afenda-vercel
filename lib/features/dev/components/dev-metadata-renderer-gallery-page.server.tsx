import "server-only"

import { redirectIfProductionDevRoute } from "../data/dev-route-gate.server"
import { DevMetadataRendererGalleryContent } from "./dev-metadata-renderer-gallery-content.server"

export default function DevMetadataRendererGalleryPage() {
  redirectIfProductionDevRoute()
  return <DevMetadataRendererGalleryContent />
}
