import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

import { organizationHrmClaimPath } from "../../../constants"
import {
  mapClaimRowToListSurfaceRow,
  type ClaimListStateLabels,
} from "./claim-list-surface-rows.shared"
import type { ClaimRow } from "./claim.queries.server"

type ClaimExceptionListCopy = {
  columnsId: string
  empty: string
  colEmployee: string
  colClaimType: string
  colClaimDate: string
  colAmount: string
  colEvidence: string
  colSubmitted: string
  evidenceCountLabel: (count: number) => string
  stateLabels: ClaimListStateLabels
}

export function buildClaimExceptionListSurfaceConfiguration(
  rows: readonly ClaimRow[],
  orgSlug: string,
  copy: ClaimExceptionListCopy
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: "Claims",
        title: "Policy exceptions",
        description: "Submitted claims that require exception approval before payout.",
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
        id: "employee",
        header: copy.colEmployee,
        cellKind: { kind: "link" },
      },
      {
        id: "claimType",
        header: copy.colClaimType,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "claimDate", header: copy.colClaimDate, cellKind: { kind: "date" } },
      { id: "amount", header: copy.colAmount },
      { id: "evidence", header: copy.colEvidence },
      {
        id: "submitted",
        header: copy.colSubmitted,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) =>
      mapClaimRowToListSurfaceRow({
        row,
        rowHref: organizationHrmClaimPath(orgSlug, row.id),
        linkColumnId: "employee",
        stateLabels: copy.stateLabels,
        formatEvidenceCount: copy.evidenceCountLabel,
      })
    ),
  }
}
