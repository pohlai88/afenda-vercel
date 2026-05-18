import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import {
  BUREAU_RELIABILITY_AUTHORITIES,
  type BureauReliabilityHealth,
  type BureauReliabilityRow,
  type BureauReliabilitySnapshot,
} from "./bureau-reliability.shared"

const COMPLIANCE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "compliance" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type BureauReliabilityListCopy = {
  empty: string
  colAuthority: string
  colHealth: string
  colSubmissions: string
  colDeliveryRate: string
  colAckRate: string
  colMedianLatency: string
  colOldestPending: string
  healthLabel: (health: BureauReliabilityHealth) => string
  formatAuthority: (row: BureauReliabilityRow) => string
  formatSubmissions: (row: BureauReliabilityRow) => string
  formatDeliveryRate: (row: BureauReliabilityRow) => string
  formatAckRate: (row: BureauReliabilityRow) => string
  formatMedianLatency: (row: BureauReliabilityRow) => string
  formatOldestPending: (row: BureauReliabilityRow) => string
}

function orderedRows(
  snapshot: BureauReliabilitySnapshot
): readonly BureauReliabilityRow[] {
  return BUREAU_RELIABILITY_AUTHORITIES.map((authority) =>
    snapshot.perAuthority.find((row) => row.authority === authority)
  ).filter((row): row is BureauReliabilityRow => row !== undefined)
}

export function buildBureauReliabilityListSurfaceConfiguration(
  snapshot: BureauReliabilitySnapshot,
  copy: BureauReliabilityListCopy
): ListSurfaceRendererConfigurationInput {
  const rows = orderedRows(snapshot)

  return {
    dataNature: "table",
    requiresErpPermission: COMPLIANCE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-compliance-bureau-reliability" },
      columnsId: "hrm-compliance-bureau-reliability",
      rowKey: "authority",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "authority", header: copy.colAuthority },
      {
        id: "health",
        header: copy.colHealth,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "submissions", header: copy.colSubmissions, align: "end" },
      { id: "deliveryRate", header: copy.colDeliveryRate, align: "end" },
      { id: "ackRate", header: copy.colAckRate, align: "end" },
      { id: "medianLatency", header: copy.colMedianLatency, align: "end" },
      { id: "oldestPending", header: copy.colOldestPending, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.authority,
      cells: {
        authority: copy.formatAuthority(row),
        health: copy.healthLabel(row.health),
        submissions: copy.formatSubmissions(row),
        deliveryRate: copy.formatDeliveryRate(row),
        ackRate: copy.formatAckRate(row),
        medianLatency: copy.formatMedianLatency(row),
        oldestPending: copy.formatOldestPending(row),
      },
    })),
  }
}
