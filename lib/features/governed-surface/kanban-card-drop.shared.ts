import type {
  KanbanCard,
  KanbanCardTransitionAvailability,
} from "./schemas/kanban-board.schema"
import {
  indexKanbanWorkflowTransitions,
  isKanbanTransitionAllowed,
  kanbanTransitionId,
  type KanbanWorkflowTransitionSet,
} from "./kanban-workflow.shared"

export type KanbanCardDropState = "allowed" | "disabled" | "forbidden"

export type KanbanCardMovePayload = {
  cardId: string
  fromColumnId: string
  toColumnId: string
  transitionId: string
}

function findTransitionAvailability(
  card: KanbanCard,
  transitionId: string
): KanbanCardTransitionAvailability | undefined {
  return card.availableTransitions?.find((t) => t.transitionId === transitionId)
}

/**
 * Resolves whether a card may be dropped on `toColumnId` using workflow edges and
 * server-owned `availableTransitions` metadata (ready / disabled / hidden).
 */
export function resolveKanbanCardDropState(
  card: KanbanCard,
  workflow: KanbanWorkflowTransitionSet | null | undefined,
  toColumnId: string
): KanbanCardDropState {
  if (card.columnId === toColumnId) {
    return "forbidden"
  }

  if (!isKanbanTransitionAllowed(workflow, card.columnId, toColumnId)) {
    return "forbidden"
  }

  const transitionId = kanbanTransitionId(card.columnId, toColumnId)
  const availability = findTransitionAvailability(card, transitionId)

  if (!availability) {
    return "forbidden"
  }

  if (availability.state === "ready") {
    return "allowed"
  }

  if (availability.state === "disabled") {
    return "disabled"
  }

  return "forbidden"
}

/** True when the card has at least one outgoing `ready` transition (draggable). */
export function isKanbanCardDraggable(
  card: KanbanCard,
  workflow: KanbanWorkflowTransitionSet | null | undefined
): boolean {
  if (!workflow) return false

  const byId = indexKanbanWorkflowTransitions(workflow)

  for (const availability of card.availableTransitions ?? []) {
    if (availability.state !== "ready") continue
    const edge = byId.get(availability.transitionId)
    if (edge && edge.fromColumnId === card.columnId) {
      return true
    }
  }

  return false
}

export function buildKanbanCardMovePayload(
  card: KanbanCard,
  toColumnId: string
): KanbanCardMovePayload {
  return {
    cardId: card.id,
    fromColumnId: card.columnId,
    toColumnId,
    transitionId: kanbanTransitionId(card.columnId, toColumnId),
  }
}
