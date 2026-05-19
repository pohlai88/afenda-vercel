import "server-only"

import { PlaygroundGatedGalleryPage } from "./playground-gated-gallery-page.server"
import { PlaygroundPatternCSectionGalleryContent } from "./playground-pattern-c-section-gallery-content.server"

export default function PlaygroundPatternCSectionGalleryPage() {
  return (
    <PlaygroundGatedGalleryPage>
      <PlaygroundPatternCSectionGalleryContent />
    </PlaygroundGatedGalleryPage>
  )
}
