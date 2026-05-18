"use client"

import { useCallback, useMemo, useState } from "react"

import {
  GovernedKanbanDragBoard,
  parseGovernedKanbanBoardConfiguration,
  type GovernedKanbanBoardConfigurationInput,
  type KanbanCardMovePayload,
} from "#features/governed-surface/client"
import type { GovernedComponentRendererDiagnostics } from "#components2/metadata/registry"

export type GalleryKanbanDragPreviewProps = {
  configuration: GovernedKanbanBoardConfigurationInput
  diagnostics?: GovernedComponentRendererDiagnostics
}

/**
 * Dev gallery bridge for `interactionMode: "drag-reorder"` — local card moves only
 * (no Server Action) so operators can exercise drop gating.
 */
export function GalleryKanbanDragPreview({
  configuration,
  diagnostics = "user",
}: GalleryKanbanDragPreviewProps) {
  const [configurationOverride, setConfigurationOverride] = useState<
    GovernedKanbanBoardConfigurationInput | null
  >(null)

  const activeConfiguration = configurationOverride ?? configuration

  const onCardMove = useCallback((payload: KanbanCardMovePayload) => {
    const parsed = parseGovernedKanbanBoardConfiguration(activeConfiguration)
    if (!parsed.success) return

    setConfigurationOverride({
      ...parsed.data,
      cards: parsed.data.cards.map((card) =>
        card.id === payload.cardId
          ? { ...card, columnId: payload.toColumnId }
          : card
      ),
    })
  }, [activeConfiguration])

  const resetKey = useMemo(
    () => JSON.stringify(configuration),
    [configuration]
  )

  return (
    <GovernedKanbanDragBoard
      key={resetKey}
      surfaceKey="gallery:kanban-recruitment-drag"
      configuration={activeConfiguration}
      onCardMove={onCardMove}
      showOperatorDiagnostics={diagnostics === "operator"}
    />
  )
}
