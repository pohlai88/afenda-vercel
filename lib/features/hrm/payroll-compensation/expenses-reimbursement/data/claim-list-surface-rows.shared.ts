import type { ListSurfaceRow } from "#features/governed-surface"

import { resolveClaimDisplayState } from "./claim-state.shared"
import type { ClaimRow } from "./claim.queries.server"

export type ClaimListStateLabels = Readonly<Record<string, string>>

export function resolveClaimStateLabel(
  row: Pick<ClaimRow, "state" | "currentApprovalId">,
  stateLabels: ClaimListStateLabels
): string {
  const displayState = resolveClaimDisplayState({
    state: row.state,
    hasPendingApproval: Boolean(row.currentApprovalId),
  })
  const stateKey =
    displayState === "under_review" ? "under_review" : row.state
  return stateLabels[stateKey] ?? stateKey
}

export function mapClaimRowToListSurfaceRow(input: {
  row: ClaimRow
  rowHref?: string
  linkColumnId?: string
  stateLabels: ClaimListStateLabels
  formatEvidenceCount: (count: number) => string
  includeEmployee?: boolean
}): ListSurfaceRow {
  const cells: Record<string, string | number | boolean> = {
    claimType: input.row.claimTypeCode,
    claimDate: input.row.claimDate,
    amount: `${input.row.amount} ${input.row.currency}`,
    state: resolveClaimStateLabel(input.row, input.stateLabels),
    submitted: input.row.submittedAt
      ? input.row.submittedAt.toLocaleString()
      : input.row.createdAt.toLocaleString(),
    evidence: input.formatEvidenceCount(input.row.evidenceCount),
  }

  if (input.includeEmployee !== false) {
    cells.employee = input.row.employeeFullName ?? input.row.employeeId
  }

  return {
    id: input.row.id,
    ...(input.rowHref ? { rowHref: input.rowHref, linkColumnId: input.linkColumnId } : {}),
    cells,
  }
}
