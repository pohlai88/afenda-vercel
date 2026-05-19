import "server-only"

import {
  buildKanbanWorkflowFromColumnTransitions,
  resolveKanbanCardTransition,
  type GovernedKanbanBoardConfigurationInput,
} from "#features/governed-surface"

import { isClaimCancellable } from "./claim-helpers.shared"
import type { ClaimRow } from "./claim.queries.server"
import {
  CLAIM_KANBAN_COLUMN_IDS,
  CLAIM_KANBAN_COLUMN_TRANSITIONS,
  type ClaimKanbanColumnId,
} from "./claim-kanban-workflow.shared"

const COLUMN_BADGE_TONE: Partial<
  Record<ClaimKanbanColumnId, "default" | "positive" | "attention" | "critical">
> = {
  submitted: "attention",
  returned: "attention",
  approved: "positive",
  rejected: "critical",
  cancelled: "critical",
  paid: "positive",
}

type ClaimKanbanCopy = {
  boardAriaLabel: string
  emptyColumn: string
  columnLabels: Record<ClaimKanbanColumnId, string>
  evidenceCount: (count: number) => string
  underReview: string
}

type ClaimKanbanDragCopy = ClaimKanbanCopy & {
  dragHandleAriaLabel: string
  cancelTransitionLabel: string
  dragDisabledUseInbox: string
  dragDisabledNotCancellable: string
}

function mapClaimRowsToKanbanCards(
  rows: readonly ClaimRow[],
  copy: ClaimKanbanCopy
) {
  return rows
    .filter((row): row is ClaimRow & { state: ClaimKanbanColumnId } =>
      (CLAIM_KANBAN_COLUMN_IDS as readonly string[]).includes(row.state)
    )
    .map((row) => {
      const badges: string[] = []
      if (row.evidenceCount > 0) {
        badges.push(copy.evidenceCount(row.evidenceCount))
      }
      if (row.state === "submitted" && row.currentApprovalId) {
        badges.push(copy.underReview)
      }

      return {
        id: row.id,
        columnId: row.state,
        title: row.employeeFullName ?? row.employeeNumber ?? row.employeeId,
        subtitle: `${row.claimTypeCode} · ${row.amount} ${row.currency}`,
        badges: badges.length > 0 ? badges : undefined,
      }
    })
}

function buildClaimKanbanDragTransitions(
  fromColumnId: ClaimKanbanColumnId,
  canCancel: boolean,
  copy: ClaimKanbanDragCopy
) {
  const targets = CLAIM_KANBAN_COLUMN_TRANSITIONS[fromColumnId]

  return targets.map((toColumnId) => {
    if (toColumnId === "cancelled") {
      return resolveKanbanCardTransition({
        fromColumnId,
        toColumnId,
        label: copy.cancelTransitionLabel,
        allowed: canCancel,
        disabledReason: canCancel ? undefined : copy.dragDisabledNotCancellable,
      })
    }

    return resolveKanbanCardTransition({
      fromColumnId,
      toColumnId,
      label: copy.columnLabels[toColumnId],
      allowed: false,
      disabledReason: copy.dragDisabledUseInbox,
    })
  })
}

export function buildClaimKanbanConfiguration(
  rows: readonly ClaimRow[],
  copy: ClaimKanbanCopy
): GovernedKanbanBoardConfigurationInput {
  const columns = CLAIM_KANBAN_COLUMN_IDS.map((id) => ({
    id,
    label: copy.columnLabels[id],
    badgeTone: COLUMN_BADGE_TONE[id],
  }))

  return {
    dataNature: "kanban",
    interactionMode: "footer-actions",
    requiresErpPermission: {
      module: "hrm",
      object: "claim",
      function: "read",
    },
    copy: {
      boardAriaLabel: copy.boardAriaLabel,
      emptyColumn: copy.emptyColumn,
    },
    workflow: buildKanbanWorkflowFromColumnTransitions(
      CLAIM_KANBAN_COLUMN_TRANSITIONS
    ),
    columns,
    columnOrder: [...CLAIM_KANBAN_COLUMN_IDS],
    cards: mapClaimRowsToKanbanCards(rows, copy),
  }
}

export function buildClaimKanbanDragConfiguration(
  rows: readonly ClaimRow[],
  copy: ClaimKanbanDragCopy
): GovernedKanbanBoardConfigurationInput {
  const columns = CLAIM_KANBAN_COLUMN_IDS.map((id) => ({
    id,
    label: copy.columnLabels[id],
    badgeTone: COLUMN_BADGE_TONE[id],
  }))

  const baseCards = mapClaimRowsToKanbanCards(rows, copy)

  return {
    dataNature: "kanban",
    interactionMode: "drag-reorder",
    requiresErpPermission: {
      module: "hrm",
      object: "claim",
      function: "update",
    },
    copy: {
      boardAriaLabel: copy.boardAriaLabel,
      emptyColumn: copy.emptyColumn,
      dragHandleAriaLabel: copy.dragHandleAriaLabel,
    },
    workflow: buildKanbanWorkflowFromColumnTransitions(
      CLAIM_KANBAN_COLUMN_TRANSITIONS
    ),
    columns,
    columnOrder: [...CLAIM_KANBAN_COLUMN_IDS],
    cards: baseCards.map((card) => ({
      ...card,
      availableTransitions: buildClaimKanbanDragTransitions(
        card.columnId as ClaimKanbanColumnId,
        isClaimCancellable(card.columnId),
        copy
      ),
    })),
  }
}
