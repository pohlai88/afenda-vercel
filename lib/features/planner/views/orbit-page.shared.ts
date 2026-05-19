import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Link2,
  Radar,
  Timer,
} from "lucide-react"

import { organizationOrbitPath } from "../constants"
import { PLANNER_VIEW_SORT_MODES } from "../constants"
import type {
  OrbitSurface,
  PlannerBlockedState,
  PlannerRelationRow,
  PlannerScopeInput,
  PlannerSurfaceRecordKind,
  PlannerViewSortMode,
} from "../types"
import type { PlannerTriageOperatingLane } from "../triage/planner-triage-rule.shared"

export const ORBIT_SURFACE_META = {
  queue: { icon: Activity },
  triage: { icon: AlertTriangle },
  today: { icon: CalendarClock },
  timeline: { icon: CalendarClock },
  signals: { icon: Radar },
  sessions: { icon: Timer },
  links: { icon: Link2 },
} as const

export type OrbitSearchParams = Record<string, string | string[] | undefined>

export function focusHref(
  basePath: string,
  searchParams: URLSearchParams,
  kind: PlannerSurfaceRecordKind,
  id: string
) {
  const next = new URLSearchParams(searchParams)
  next.set("focusKind", kind)
  next.set("focusId", id)
  next.delete("status")
  return `${basePath}?${next.toString()}`
}

export function summaryValue(value: number) {
  return new Intl.NumberFormat("en").format(value)
}

export function toDatetimeLocalValue(date: Date | null | undefined) {
  if (!date) return ""
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

export function plannerBasePath(input: {
  scope: PlannerScopeInput
  orgSlug?: string
  surface: OrbitSurface
}) {
  if (input.scope.scopeKind !== "organization") {
    throw new Error("OrbitPage requires organization scope")
  }
  if (!input.orgSlug) {
    throw new Error("OrbitPage requires an organization slug")
  }
  return organizationOrbitPath(input.orgSlug, input.surface)
}

export function firstSearchValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return typeof value === "string" ? value : null
}

export function toUrlSearchParams(searchParams: OrbitSearchParams | undefined) {
  const next = new URLSearchParams()
  if (!searchParams) return next

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (Array.isArray(rawValue)) {
      for (const entry of rawValue) next.append(key, entry)
      continue
    }
    if (typeof rawValue === "string") next.set(key, rawValue)
  }

  return next
}

export function buildOrbitHref(
  basePath: string,
  patch: Record<string, string | null | undefined>,
  currentSearchParams?: OrbitSearchParams
) {
  const search = toUrlSearchParams(currentSearchParams)

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
      search.delete(key)
      continue
    }
    search.set(key, value)
  }

  const next = search.toString()
  return next.length > 0 ? `${basePath}?${next}` : basePath
}

export function filterSelectValue(values: readonly string[] | undefined) {
  return values?.[0] ?? ""
}

export function isPlannerViewSortMode(
  value: string | null
): value is PlannerViewSortMode {
  return (
    value != null &&
    (PLANNER_VIEW_SORT_MODES as readonly string[]).includes(value)
  )
}

export function sortModeLabel(sortMode: PlannerViewSortMode | null) {
  if (sortMode === "priority_desc") return "Priority"
  if (sortMode === "due_asc") return "Due date"
  if (sortMode === "created_desc") return "Created"
  if (sortMode === "updated_desc") return "Updated"
  if (sortMode === "title_asc") return "Title"
  return "Default"
}

export function blockedStageLabel(stage: PlannerBlockedState["stage"]) {
  if (stage === "critical") return "Breach"
  if (stage === "urgent") return "Overdue"
  return "Threshold"
}

export function blockedStageVariant(stage: PlannerBlockedState["stage"]) {
  if (stage === "critical") return "critical" as const
  if (stage === "urgent") return "warning" as const
  return "outline" as const
}

export function noticeSeverityVariant(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return "critical" as const
  if (severity === "warning") return "warning" as const
  return "info" as const
}

export function triageOperatingLaneLabel(lane: PlannerTriageOperatingLane) {
  if (lane === "automation_attention") return "Automation attention"
  if (lane === "blocked_recovery") return "Blocked recovery"
  if (lane === "high_pressure") return "High pressure"
  if (lane === "signal_intake") return "Signal intake"
  return "Manual follow-up"
}

export function relationLabel(relation: PlannerRelationRow) {
  const target =
    relation.relatedItemTitle ??
    relation.relatedSignalTitle ??
    relation.relatedItemId ??
    relation.relatedSignalId ??
    "Unknown target"

  return `${relation.relationType} · ${target}`
}

/** Pattern B table surfaces (card lists stay handcrafted for batch UX). */
export function orbitSurfaceUsesGovernedTable(surface: OrbitSurface) {
  return surface === "sessions" || surface === "links" || surface === "signals"
}
