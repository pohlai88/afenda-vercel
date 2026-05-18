"use client"

import { GovernedKanbanFooterBoard } from "#features/governed-surface/client"
import type {
  GovernedKanbanBoardConfigurationInput,
  KanbanCard,
} from "#features/governed-surface/client"

import {
  ClaimKanbanCardFooter,
  type ClaimKanbanCardContext,
} from "./claim-kanban-card-footer.client"

export const CLAIMS_KANBAN_SURFACE_KEY = "hrm:claims:kanban" as const

export type ClaimKanbanBoardProps = {
  configuration: GovernedKanbanBoardConfigurationInput
  cardContexts: Record<string, ClaimKanbanCardContext>
  orgSlug: string
}

export function ClaimKanbanBoard({
  configuration,
  cardContexts,
  orgSlug,
}: ClaimKanbanBoardProps) {
  return (
    <GovernedKanbanFooterBoard
      surfaceKey={CLAIMS_KANBAN_SURFACE_KEY}
      configuration={configuration}
      renderCardFooter={(card: KanbanCard) => {
        const context = cardContexts[card.id]
        if (!context) return null
        return <ClaimKanbanCardFooter orgSlug={orgSlug} context={context} />
      }}
    />
  )
}
