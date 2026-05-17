import { Suspense } from "react"

import HrmMetadataPreviewPage from "#components2/dev/hrm-metadata-preview/preview-page"

function HrmMetadataPreviewFallback() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      Loading HRM metadata preview…
    </div>
  )
}

export default function HrmMetadataPreviewRoute(
  props: PageProps<"/[locale]/dev/hrm-metadata-preview">
) {
  return (
    <Suspense fallback={<HrmMetadataPreviewFallback />}>
      <HrmMetadataPreviewPage {...props} />
    </Suspense>
  )
}
