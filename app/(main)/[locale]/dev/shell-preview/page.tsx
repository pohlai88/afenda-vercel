import { Suspense } from "react"

import AppShellPreviewPage from "#components2/dev/app-shell-preview/preview-page"

function ShellPreviewFallback() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      Loading shell preview…
    </div>
  )
}

export default function ShellPreviewPage(
  props: PageProps<"/[locale]/dev/shell-preview">
) {
  return (
    <Suspense fallback={<ShellPreviewFallback />}>
      <AppShellPreviewPage {...props} />
    </Suspense>
  )
}
