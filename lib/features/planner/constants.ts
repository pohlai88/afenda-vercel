import type { Route } from "next"

import {
  ORBIT_DASHBOARD_SURFACES,
  type OrbitDashboardSurface,
} from "#lib/planner-dashboard.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

export const PLANNER_SIGNAL_CLASSES = [
  "anomaly",
  "deadline",
  "escalation",
  "dependency",
  "verification",
  "review",
  "alert",
  "recommendation",
  "prediction",
  "manual_capture",
] as const

export const PLANNER_SIGNAL_LIFECYCLES = [
  "detected",
  "correlated",
  "promoted",
  "deferred",
  "suppressed",
  "expired",
  "auto_resolved",
  "dismissed",
] as const

export const PLANNER_ITEM_LIFECYCLES = [
  "triaged",
  "assigned",
  "scheduled",
  "active",
  "blocked",
  "awaiting_external",
  "ready_for_review",
  "verified",
  "resolved",
  "deprecated",
  "cancelled",
] as const

export const PLANNER_ACTIVE_ITEM_LIFECYCLES = [
  "triaged",
  "assigned",
  "scheduled",
  "active",
  "blocked",
  "awaiting_external",
  "ready_for_review",
] as const

export const PLANNER_ACTIVE_SIGNAL_LIFECYCLES = [
  "detected",
  "correlated",
  "deferred",
  "suppressed",
] as const

export const PLANNER_OWNERSHIP_ROLES = [
  "owner",
  "assignee",
  "reviewer",
  "watcher",
  "escalation_owner",
  "originating_system",
  "automation_actor",
] as const

export const PLANNER_RELATION_TYPES = [
  "parent",
  "subtask",
  "blocks",
  "blocked_by",
  "duplicate",
  "related",
] as const

export type PlannerRelationType = (typeof PLANNER_RELATION_TYPES)[number]

export const PLANNER_DISPLAY_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const

export const PLANNER_VIEW_SORT_MODES = [
  "priority_desc",
  "due_asc",
  "created_desc",
  "updated_desc",
  "title_asc",
] as const

export const PLANNER_SIGNAL_RESOLUTION_POLICIES = [
  "none",
  "auto_resolve",
  "suppress",
] as const

export const PLANNER_AUTOMATION_ATTENTION_NOTICE_TITLE_PREFIXES = [
  "Orbit reminder delivery failed:",
  "Orbit recurrence processing failed:",
] as const

export const ORBIT_PRIMARY_SURFACES = ORBIT_DASHBOARD_SURFACES

export type OrbitPrimarySurface = OrbitDashboardSurface

export function organizationOrbitPath(
  orgSlug: string,
  surface: OrbitDashboardSurface = "queue"
): Route {
  const slug = normalizeOrgSlugParam(orgSlug)
  if (!slug) {
    throw new Error("organizationOrbitPath: invalid org slug")
  }
  const base = `/o/${slug}/dashboard/orbit`
  return (surface === "queue" ? base : `${base}/${surface}`) as Route
}

export function accountOrbitPath(
  surface: OrbitDashboardSurface = "queue"
): Route {
  const base = "/account/orbit"
  return (surface === "queue" ? base : `${base}/${surface}`) as Route
}
