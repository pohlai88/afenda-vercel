import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

import { mapClaimRowToListSurfaceRow } from "./claim-list-surface-rows.shared"
import type { ClaimRow } from "./claim.queries.server"
import type { ClaimListStateLabels } from "./claim-list-surface-rows.shared"

type ClaimPortalListCopy = {
  columnsId: string
  empty: string
  colClaimDate: string
  colAmount: string
  colState: string
  colEvidence: string
  evidenceCountLabel: (count: number) => string
  stateLabels: ClaimListStateLabels
}

export function buildClaimPortalListSurfaceConfiguration(
  rows: readonly ClaimRow[],
  claimDetailHref: (claimId: string) => string,
  copy: ClaimPortalListCopy
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: "Claims",
        title: "Recent claims",
        description: "Your submitted expense claims.",
      },
      columnsId: copy.columnsId,
      rowKey: "id",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      {
        id: "claimDate",
        header: copy.colClaimDate,
        cellKind: { kind: "link" },
      },
      { id: "amount", header: copy.colAmount },
      {
        id: "state",
        header: copy.colState,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "evidence", header: copy.colEvidence },
    ],
    rows: rows.map((row) =>
      mapClaimRowToListSurfaceRow({
        row,
        rowHref: claimDetailHref(row.id),
        linkColumnId: "claimDate",
        stateLabels: copy.stateLabels,
        formatEvidenceCount: copy.evidenceCountLabel,
        includeEmployee: false,
      })
    ),
  }
}
