"use client"

import type { GovernedKanbanBoardConfigurationInput } from "#features/governed-surface/client"
import { GovernedKanbanFooterBoard } from "#features/governed-surface/client"
import { Button } from "#components2/ui/button"
import type { GovernedComponentRendererDiagnostics } from "#components2/metadata/registry"

export type GalleryKanbanFooterPreviewProps = {
  configuration: GovernedKanbanBoardConfigurationInput
  diagnostics?: GovernedComponentRendererDiagnostics
}

/**
 * Dev gallery bridge for `interactionMode: "footer-actions"` — mirrors production
 * `GovernedKanbanFooterBoard` + domain `renderCardFooter` without Server Actions.
 */
export function GalleryKanbanFooterPreview({
  configuration,
  diagnostics = "user",
}: GalleryKanbanFooterPreviewProps) {
  return (
    <GovernedKanbanFooterBoard
      surfaceKey="gallery:kanban-recruitment-footer"
      configuration={configuration}
      showOperatorDiagnostics={diagnostics === "operator"}
      renderCardFooter={() => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled>
            Move to screening
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled>
            Reject
          </Button>
        </div>
      )}
    />
  )
}
