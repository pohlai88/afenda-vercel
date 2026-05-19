import "server-only"

import {
  assertGovernedSurfaceInput,
  listSurfaceRendererConfigurationSchema,
} from "#features/governed-surface"

import type { OperationalPressureItem } from "../types"
import {
  NEXUS_LIST_PRESENTATION,
  NEXUS_PRESSURE_SURFACE_KEY,
} from "./nexus-list-surface.shared"

function severityLabel(severity: OperationalPressureItem["severity"]): string {
  switch (severity) {
    case "emergency":
      return "Emergency"
    case "critical":
      return "Critical"
    case "attention":
      return "Attention"
    default:
      return "Ambient"
  }
}

function formatPressureDetail(item: OperationalPressureItem): string {
  const evidence =
    item.evidenceCount > 0
      ? ` · ${item.evidenceCount} evidence item${item.evidenceCount === 1 ? "" : "s"}`
      : ""
  return `${item.reason}${evidence}`
}

export function buildNexusPressureListSurfaceConfiguration(
  items: readonly OperationalPressureItem[]
) {
  return assertGovernedSurfaceInput(
    listSurfaceRendererConfigurationSchema,
    {
      dataNature: "table",
      presentation: NEXUS_LIST_PRESENTATION,
      surface: {
        header: { title: NEXUS_PRESSURE_SURFACE_KEY },
        columnsId: NEXUS_PRESSURE_SURFACE_KEY,
        rowKey: "id",
        empty: {
          variant: "muted",
          title: "No pressure detected. The system is calm.",
        },
      },
      columns: [
        { id: "severity", header: "Severity" },
        { id: "surface", header: "Surface" },
        { id: "title", header: "Title" },
        { id: "detail", header: "Detail" },
        {
          id: "action",
          header: "Action",
          align: "end",
          cellKind: { kind: "link" },
        },
      ],
      rows: items.map((item) => ({
        id: item.id,
        rowHref: String(item.primaryAction.command),
        linkColumnId: "action",
        cells: {
          severity: item.stageBadge
            ? `${severityLabel(item.severity)} · ${item.stageBadge.label}`
            : severityLabel(item.severity),
          surface: item.surface,
          title: item.title,
          detail: formatPressureDetail(item),
          action: item.primaryAction.label,
        },
      })),
    },
    NEXUS_PRESSURE_SURFACE_KEY
  )
}
