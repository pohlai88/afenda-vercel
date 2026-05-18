import type { Route } from "next"
import Link from "next/link"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import { SHELL_PREVIEW_HREF } from "../fixtures/preview-href.shared"
import { GalleryPatternCTrailingCell } from "./gallery-pattern-c-trailing-cell.client"
import {
  GALLERY_PATTERN_C_EMPTY,
  GALLERY_PATTERN_C_INVALID,
  GALLERY_PATTERN_C_READY,
} from "./pattern-c-gallery-fixtures"

export function PatternCSectionGalleryContent() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Dev · metadata UI · Pattern C
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Governed Pattern C section gallery
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Reference states for <code>GovernedPatternCListSection</code> (Wave C1–C3):
          forbidden, invalid config, empty, ready table, and trailing-action metadata
          with disabled tooltips.
        </p>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/en/dev/metadata-renderer-gallery"
            prefetch={false}
            className="text-primary hover:underline"
          >
            Renderer gallery (Pattern B)
          </Link>
          <Link
            href={SHELL_PREVIEW_HREF as Route}
            prefetch={false}
            className="text-primary hover:underline"
          >
            Shell preview
          </Link>
        </nav>
      </header>

      <div className="flex flex-col gap-10">
        <section id="pattern-c-forbidden" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Forbidden</h2>
          <p className="text-sm text-muted-foreground">
            <code>parentAccessAllowed=false</code> — section-level denial before parse.
          </p>
          <GovernedPatternCListSection
            title="Onboarding contracts"
            description="You should not see row data."
            listConfiguration={GALLERY_PATTERN_C_READY}
            surfaceKey="gallery:pattern-c:forbidden"
            parentAccessAllowed={false}
            resolveConfiguredPermission={false}
          />
        </section>

        <section id="pattern-c-invalid" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Invalid configuration</h2>
          <p className="text-sm text-muted-foreground">
            Zod parse failure — <code>GovernedEmpty</code> error variant.
          </p>
          <GovernedPatternCListSection
            title="Broken list"
            listConfiguration={
              GALLERY_PATTERN_C_INVALID as ListSurfaceRendererConfigurationInput
            }
            surfaceKey="gallery:pattern-c:invalid"
            resolveConfiguredPermission={false}
          />
        </section>

        <section id="pattern-c-empty" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Empty</h2>
          <p className="text-sm text-muted-foreground">
            Valid config with zero metadata rows — governed list empty state.
          </p>
          <GovernedPatternCListSection
            title="No contracts"
            description="Empty fixture."
            listConfiguration={GALLERY_PATTERN_C_EMPTY}
            surfaceKey="gallery:pattern-c:empty"
            resolveConfiguredPermission={false}
          />
        </section>

        <section id="pattern-c-trailing-disabled" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Ready + trailing metadata</h2>
          <p className="text-sm text-muted-foreground">
            Row 1: <code>trailingAction.state=disabled</code> with tooltip. Row 2:
            ready.
          </p>
          <GovernedPatternCListSection
            title="Active contracts"
            description="Trailing column honors row metadata (Wave C3)."
            listConfiguration={GALLERY_PATTERN_C_READY}
            surfaceKey="gallery:pattern-c:trailing"
            resolveConfiguredPermission={false}
            trailingColumn={{
              header: "Actions",
              render: (surfaceRow) => {
                if (
                  !isListSurfaceTrailingActionRenderable(
                    surfaceRow.trailingAction
                  )
                ) {
                  return null
                }
                return (
                  <GalleryPatternCTrailingCell
                    trailingAction={surfaceRow.trailingAction}
                  />
                )
              },
            }}
          />
        </section>
      </div>
    </div>
  )
}
