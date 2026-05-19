import "server-only"

import { redirectIfProductionDevRoute } from "../data/dev-route-gate.server"
import { DevPatternCSectionGalleryContent } from "./dev-pattern-c-section-gallery-content.server"

export default function DevPatternCSectionGalleryPage() {
  redirectIfProductionDevRoute()
  return <DevPatternCSectionGalleryContent />
}
