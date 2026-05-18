import type {
  KanbanCard,
  KanbanWorkflowTransition,
} from "./schemas/kanban-board.schema"

export type KanbanWorkflowEdgeMap = Readonly<
  Record<string, readonly KanbanWorkflowTransition[]>
>

export type KanbanWorkflowTransitionSet = {
  readonly transitions: readonly KanbanWorkflowTransition[]
}

/** Canonical workflow edge id — must match `resolveKanbanCardTransition`. */
export function kanbanTransitionId(
  fromColumnId: string,
  toColumnId: string
): string {
  return `${fromColumnId}->${toColumnId}`
}

/**
 * Builds a governed kanban workflow from a domain transition table
 * (`from` column id → allowed `to` column ids).
 */
export function buildKanbanWorkflowFromColumnTransitions(
  transitions: Readonly<Record<string, readonly string[]>>
): { transitions: KanbanWorkflowTransition[] } {
  const edges: KanbanWorkflowTransition[] = []

  for (const [fromColumnId, targets] of Object.entries(transitions)) {
    for (const toColumnId of targets) {
      edges.push({
        id: kanbanTransitionId(fromColumnId, toColumnId),
        fromColumnId,
        toColumnId,
      })
    }
  }

  return { transitions: edges }
}

export function indexKanbanWorkflowTransitions(
  workflow: KanbanWorkflowTransitionSet | null | undefined
): Map<string, KanbanWorkflowTransition> {
  const map = new Map<string, KanbanWorkflowTransition>()
  if (!workflow) return map

  for (const transition of workflow.transitions) {
    map.set(transition.id, transition)
  }

  return map
}

export function isKanbanTransitionAllowed(
  workflow: KanbanWorkflowTransitionSet | null | undefined,
  fromColumnId: string,
  toColumnId: string
): boolean {
  if (!workflow) return false
  return workflow.transitions.some(
    (edge) =>
      edge.fromColumnId === fromColumnId && edge.toColumnId === toColumnId
  )
}

export function validateKanbanCardTransitions(
  card: KanbanCard,
  workflow: KanbanWorkflowTransitionSet | null | undefined
): string | null {
  if (!card.availableTransitions?.length) return null
  if (!workflow) {
    return `Card "${card.id}" declares availableTransitions but the board has no workflow.`
  }

  const byId = indexKanbanWorkflowTransitions(workflow)

  for (const availability of card.availableTransitions) {
    const edge = byId.get(availability.transitionId)
    if (!edge) {
      return `Card "${card.id}" references unknown transition "${availability.transitionId}".`
    }
    if (edge.fromColumnId !== card.columnId) {
      return `Card "${card.id}" transition "${availability.transitionId}" does not start from column "${card.columnId}".`
    }
  }

  return null
}
