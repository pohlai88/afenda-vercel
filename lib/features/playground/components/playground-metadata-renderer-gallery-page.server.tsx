import "server-only"

import { PlaygroundGatedGalleryPage } from "./playground-gated-gallery-page.server"
import { PlaygroundMetadataRendererGalleryContent } from "./playground-metadata-renderer-gallery-content.server"

export default function PlaygroundMetadataRendererGalleryPage() {
  return (
    <PlaygroundGatedGalleryPage>
      <PlaygroundMetadataRendererGalleryContent />
    </PlaygroundGatedGalleryPage>
  )
}
