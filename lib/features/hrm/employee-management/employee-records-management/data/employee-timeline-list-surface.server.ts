import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { EmployeeIamAuditTimelineRow } from "../../../types"

import {
  buildEmployeeTimelineMetadataView,
  type EmployeeTimelineFacetLabelKey,
} from "./employee-timeline-metadata.shared"

const EMPLOYEE_READ_PERMISSION = {
  module: "hrm" as const,
  object: "employee" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type EmployeeTimelineListCopy = {
  empty: string
  colAction: string
  colWhen: string
  colActor: string
  colDetails: string
  actionLabelFor: (action: string) => string
  formatWhen: (value: Date) => string
  actorLabelFor: (row: EmployeeIamAuditTimelineRow) => string
  facetLabelFor: (labelKey: EmployeeTimelineFacetLabelKey) => string
  formatFacetValue: (
    labelKey: EmployeeTimelineFacetLabelKey,
    value: string
  ) => string
  actorUnknown: string
}

function shortId(id: string | null): string | null {
  if (!id) return null
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

function formatDetails(
  row: EmployeeIamAuditTimelineRow,
  copy: EmployeeTimelineListCopy
): string {
  const metaView = buildEmployeeTimelineMetadataView(row.metadata)
  const resourceBits = [row.resourceType, shortId(row.resourceId)]
    .filter(Boolean)
    .join(" · ")
  const facetSummary =
    metaView.facets.length > 0
      ? metaView.facets
          .map(
            (facet) =>
              `${copy.facetLabelFor(facet.labelKey)}: ${copy.formatFacetValue(facet.labelKey, facet.value)}`
          )
          .join(" · ")
      : null
  return [metaView.narrative, resourceBits, facetSummary]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" — ")
}

export function buildEmployeeTimelineListSurfaceConfiguration(
  rows: readonly EmployeeIamAuditTimelineRow[],
  copy: EmployeeTimelineListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: EMPLOYEE_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-employee-timeline" },
      columnsId: "hrm-employee-timeline",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "action", header: copy.colAction },
      {
        id: "when",
        header: copy.colWhen,
        cellKind: { kind: "datetime" },
      },
      { id: "actor", header: copy.colActor },
      { id: "details", header: copy.colDetails },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        action: copy.actionLabelFor(row.action),
        when: copy.formatWhen(row.createdAt),
        actor: copy.actorLabelFor(row),
        details: formatDetails(row, copy) || "—",
      },
    })),
  }
}
