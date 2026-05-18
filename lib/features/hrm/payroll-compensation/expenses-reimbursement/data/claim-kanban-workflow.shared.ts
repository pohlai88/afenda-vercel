import type { ClaimStateValue } from "./claim-helpers.shared"

/** Columns shown on the org claims kanban (excludes draft — employee submit flow only). */
export const CLAIM_KANBAN_COLUMN_IDS = [
  "submitted",
  "returned",
  "approved",
  "rejected",
  "paid",
  "cancelled",
] as const satisfies readonly ClaimStateValue[]

export type ClaimKanbanColumnId = (typeof CLAIM_KANBAN_COLUMN_IDS)[number]

/** Workflow edges for governed kanban validation (footer-actions use domain forms, not drag). */
export const CLAIM_KANBAN_COLUMN_TRANSITIONS: Readonly<
  Record<ClaimKanbanColumnId, readonly ClaimKanbanColumnId[]>
> = {
  submitted: ["approved", "rejected", "returned", "cancelled"],
  returned: ["submitted", "cancelled"],
  approved: ["paid", "cancelled"],
  rejected: [],
  paid: [],
  cancelled: [],
}

const STATE_TO_COLUMN: Partial<
  Record<ClaimStateValue, ClaimKanbanColumnId>
> = {
  submitted: "submitted",
  returned: "returned",
  approved: "approved",
  rejected: "rejected",
  paid: "paid",
  cancelled: "cancelled",
}

export function claimKanbanColumnIdFromState(
  state: ClaimStateValue
): ClaimKanbanColumnId | null {
  return STATE_TO_COLUMN[state] ?? null
}

export function isClaimKanbanColumnId(
  value: string
): value is ClaimKanbanColumnId {
  return (CLAIM_KANBAN_COLUMN_IDS as readonly string[]).includes(value)
}
