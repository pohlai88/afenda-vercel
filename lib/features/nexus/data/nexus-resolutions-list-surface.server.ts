import "server-only"

import {
  assertGovernedSurfaceInput,
  listSurfaceRendererConfigurationSchema,
} from "#features/governed-surface"

import type { ResolutionEvent } from "../types"
import {
  NEXUS_LIST_PRESENTATION,
  NEXUS_RESOLUTIONS_SURFACE_KEY,
} from "./nexus-list-surface.shared"

function formatResolutionWhen(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (ms < minute) return "just now"
  if (ms < hour) return `${Math.floor(ms / minute)}m ago`
  if (ms < day) return `${Math.floor(ms / hour)}h ago`
  return `${Math.floor(ms / day)}d ago`
}

function formatResolutionMeta(event: ResolutionEvent): string {
  const lynx = event.lynxAssisted ? " · Lynx-assisted" : ""
  return `${event.surface} · ${formatResolutionWhen(event.resolvedAt)}${lynx}`
}

function formatResolutionDetail(event: ResolutionEvent): string {
  const evidence =
    event.evidenceCount > 0
      ? ` · ${event.evidenceCount} evidence item${event.evidenceCount === 1 ? "" : "s"}`
      : ""
  return `${event.consequence}${evidence} · ${event.actorName}`
}

export function buildNexusResolutionsListSurfaceConfiguration(
  events: readonly ResolutionEvent[]
) {
  return assertGovernedSurfaceInput(
    listSurfaceRendererConfigurationSchema,
    {
      dataNature: "table",
      presentation: NEXUS_LIST_PRESENTATION,
      surface: {
        header: { title: NEXUS_RESOLUTIONS_SURFACE_KEY },
        columnsId: NEXUS_RESOLUTIONS_SURFACE_KEY,
        rowKey: "id",
        empty: { variant: "muted", title: "No resolutions yet." },
      },
      columns: [
        { id: "meta", header: "Context" },
        {
          id: "what",
          header: "Resolution",
          cellKind: { kind: "link" },
        },
        { id: "detail", header: "Detail" },
      ],
      rows: events.map((event) => ({
        id: event.id,
        rowHref: String(event.href),
        linkColumnId: "what",
        cells: {
          meta: formatResolutionMeta(event),
          what: event.what,
          detail: formatResolutionDetail(event),
        },
      })),
    },
    NEXUS_RESOLUTIONS_SURFACE_KEY
  )
}
