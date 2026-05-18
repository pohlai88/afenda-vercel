import type { KanbanCardTransitionAvailability } from "./schemas/kanban-board.schema"
import { kanbanTransitionId } from "./kanban-workflow.shared"

export type ResolveKanbanCardTransitionInput = {
  fromColumnId: string
  toColumnId: string
  label: string
  /** When false, the hint is omitted from read-only boards. Default true. */
  visible?: boolean
  /** When false, UI renders a disabled badge with `disabledReason`. */
  allowed: boolean
  /** Required when `allowed` is false (surfaced via tooltip / title on read-only boards). */
  disabledReason?: string
}

/**
 * Pure helper for domain kanban builders — encodes visibility, ERP authorization
 * outcome, and human-readable disable copy in `availableTransitions` metadata.
 *
 * Pair with `buildKanbanWorkflowFromColumnTransitions` on the board configuration.
 */
export function resolveKanbanCardTransition(
  input: ResolveKanbanCardTransitionInput
): KanbanCardTransitionAvailability {
  const transitionId = kanbanTransitionId(input.fromColumnId, input.toColumnId)

  if (input.visible === false) {
    return { transitionId, state: "hidden", label: input.label }
  }
  if (input.allowed) {
    return { transitionId, state: "ready", label: input.label }
  }
  const disabledReason = input.disabledReason?.trim()
  return {
    transitionId,
    state: "disabled",
    label: input.label,
    disabledReason:
      disabledReason && disabledReason.length > 0
        ? disabledReason
        : "Not permitted",
  }
}

export function kanbanCardTransitionHidden(
  fromColumnId: string,
  toColumnId: string,
  label: string
): KanbanCardTransitionAvailability {
  return {
    transitionId: kanbanTransitionId(fromColumnId, toColumnId),
    state: "hidden",
    label,
  }
}

export function isKanbanCardTransitionRenderable(
  transition: KanbanCardTransitionAvailability | undefined
): transition is KanbanCardTransitionAvailability & {
  state: "ready" | "disabled"
} {
  return transition?.state === "ready" || transition?.state === "disabled"
}

export type KanbanOutgoingTransitionTargetInput = {
  toColumnId: string
  label: string
  visible?: boolean
  allowed: boolean
  disabledReason?: string
}

/**
 * Resolves all outgoing transition hints from a column for read-only boards.
 * Targets must align with `workflow.transitions` edges from `fromColumnId`.
 */
export function buildKanbanOutgoingTransitionHints(
  fromColumnId: string,
  targets: readonly KanbanOutgoingTransitionTargetInput[]
): KanbanCardTransitionAvailability[] {
  return targets.map((target) =>
    resolveKanbanCardTransition({
      fromColumnId,
      toColumnId: target.toColumnId,
      label: target.label,
      visible: target.visible,
      allowed: target.allowed,
      disabledReason: target.disabledReason,
    })
  )
}
