"use client"

import { useState, useTransition } from "react"

import { useRouter } from "#i18n/navigation"
import type { GovernedKanbanBoardConfigurationInput } from "#features/governed-surface/client"
import { GovernedKanbanDragBoard } from "#features/governed-surface/client"

import { moveClaimKanbanCardAction } from "../actions/claim-kanban.actions"

export const CLAIMS_KANBAN_DRAG_SURFACE_KEY = "hrm:claims:kanban:drag"

type ClaimKanbanDragBoardProps = {
  configuration: GovernedKanbanBoardConfigurationInput
}

export function ClaimKanbanDragBoard({
  configuration,
}: ClaimKanbanDragBoardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)

  return (
    <GovernedKanbanDragBoard
      configuration={configuration}
      surfaceKey={CLAIMS_KANBAN_DRAG_SURFACE_KEY}
      isMovePending={isPending}
      pendingCardId={pendingCardId}
      onCardMove={(payload) => {
        setPendingCardId(payload.cardId)
        startTransition(async () => {
          const result = await moveClaimKanbanCardAction(
            payload.cardId,
            payload.toColumnId
          )
          setPendingCardId(null)
          if (result.ok) {
            router.refresh()
          }
        })
      }}
    />
  )
}
