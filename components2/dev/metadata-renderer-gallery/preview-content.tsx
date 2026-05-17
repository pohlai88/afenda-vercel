import type { Route } from "next"
import Link from "next/link"

import { SHELL_PREVIEW_HREF } from "../fixtures/preview-href.shared"
import { GALLERY_SCENARIOS } from "./gallery-scenarios"
import { GalleryPreviewFrame } from "./gallery-preview-frame.client"

export function MetadataRendererGalleryContent() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Dev · metadata UI · playground
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Governed renderer gallery
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Reference catalog for all shipped <code>governed:*</code> renderers.
          Adjust container width and diagnostics mode per scenario (ADR-0026
          playground). Fixtures are validated with{" "}
          <code>assertGovernedSurfaceInput</code> at build time.
        </p>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href={SHELL_PREVIEW_HREF as Route}
            prefetch={false}
            className="text-primary hover:underline"
          >
            Shell preview (ADR-0021)
          </Link>
        </nav>
      </header>

      <div className="flex flex-col gap-10">
        {GALLERY_SCENARIOS.map((scenario) => (
          <GalleryPreviewFrame
            key={scenario.id}
            scenarioId={scenario.id}
            title={scenario.title}
            description={scenario.description}
            minWidthPx={scenario.minWidthPx}
            component={scenario.component}
            defaultDiagnostics={scenario.diagnostics}
          />
        ))}
      </div>
    </div>
  )
}
