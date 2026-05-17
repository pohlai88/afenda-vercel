import type { Route } from "next"
import Link from "next/link"

import { GovernedComponentRenderer } from "#components2/metadata"

import {
  HRM_METADATA_PREVIEW_HREF,
  SHELL_PREVIEW_HREF,
} from "../fixtures/preview-href.shared"
import { GALLERY_SCENARIOS } from "./gallery-scenarios"

export function MetadataRendererGalleryContent() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Dev · metadata UI
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Governed renderer gallery
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Reference catalog for all shipped <code>governed:*</code> renderers.
          Fixtures are validated with{" "}
          <code>assertGovernedSurfaceInput</code> at build time. Use this
          surface when replacing legacy Card/Table pages module-by-module.
        </p>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href={SHELL_PREVIEW_HREF as Route}
            prefetch={false}
            className="text-primary hover:underline"
          >
            Shell preview
          </Link>
          <Link
            href={HRM_METADATA_PREVIEW_HREF as Route}
            prefetch={false}
            className="text-primary hover:underline"
          >
            HRM metadata scenarios
          </Link>
        </nav>
      </header>

      <div className="flex flex-col gap-10">
        {GALLERY_SCENARIOS.map((scenario) => (
          <section
            key={scenario.id}
            id={scenario.id}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-medium">{scenario.title}</h2>
              <p className="text-sm text-muted-foreground">
                {scenario.description}
                {scenario.minWidthPx != null
                  ? ` · min ${scenario.minWidthPx}px`
                  : null}
              </p>
            </div>
            <div
              className="rounded-2xl border border-border/60 bg-card/40 p-4"
              style={
                scenario.minWidthPx != null
                  ? { maxWidth: scenario.minWidthPx }
                  : undefined
              }
            >
              <GovernedComponentRenderer
                component={scenario.component}
                diagnostics={scenario.diagnostics}
                surfaceKey={`gallery:${scenario.id}`}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
