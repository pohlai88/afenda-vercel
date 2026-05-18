"use client"

import { GovernedKanbanFooterBoard } from "#features/governed-surface/client"
import type {
  GovernedKanbanBoardConfigurationInput,
  KanbanCard,
} from "#features/governed-surface/client"

import {
  RecruitmentPipelineCardActions,
  type RecruitmentPipelineCardContext,
} from "./recruitment-pipeline-card-actions.client"

export const RECRUITMENT_PIPELINE_KANBAN_SURFACE_KEY =
  "hrm:recruitment:pipeline" as const

export type RecruitmentPipelineKanbanBoardProps = {
  configuration: GovernedKanbanBoardConfigurationInput
  cardContexts: Record<string, RecruitmentPipelineCardContext>
  orgSlug: string
  userId: string
}

export function RecruitmentPipelineKanbanBoard({
  configuration,
  cardContexts,
  orgSlug,
  userId,
}: RecruitmentPipelineKanbanBoardProps) {
  return (
    <GovernedKanbanFooterBoard
      surfaceKey={RECRUITMENT_PIPELINE_KANBAN_SURFACE_KEY}
      configuration={configuration}
      renderCardFooter={(card: KanbanCard) => {
        const context = cardContexts[card.id]
        if (!context) return null
        return (
          <RecruitmentPipelineCardActions
            orgSlug={orgSlug}
            userId={userId}
            context={context}
          />
        )
      }}
    />
  )
}
