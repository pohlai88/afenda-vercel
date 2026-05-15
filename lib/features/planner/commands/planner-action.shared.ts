import type { Route } from "next"

import { organizationOrbitPath } from "../constants"
import { revalidateOrgOrbitRoutes } from "../data/planner-revalidate.server"

export type PlannerActionScopeKind = "organization"

export function readPlannerActionScopeKind(
  _formData: FormData
): PlannerActionScopeKind {
  return "organization"
}

export function readPlannerActionSurface(
  formData: FormData,
  fallback: string
): string {
  return String(formData.get("surface") ?? fallback)
}

export function readPlannerActionOrgSlug(formData: FormData): string | null {
  return String(formData.get("orgSlug") ?? "") || null
}

export function orbitScopedPath(input: {
  scopeKind: PlannerActionScopeKind
  orgSlug: string | null
  surface: string
}): Route {
  if (!input.orgSlug) return "/o" as Route
  return organizationOrbitPath(input.orgSlug, input.surface as never)
}

export function orbitStatusPath(input: {
  scopeKind: PlannerActionScopeKind
  orgSlug: string | null
  surface: string
  status: string
  focusKind?: string
  focusId?: string
}): Route {
  const base = orbitScopedPath(input)
  const search = new URLSearchParams({ status: input.status })
  if (input.focusKind) search.set("focusKind", input.focusKind)
  if (input.focusId) search.set("focusId", input.focusId)
  return `${base}?${search.toString()}` as Route
}

export function revalidateOrbitScope(scopeKind: PlannerActionScopeKind): void {
  void scopeKind
  revalidateOrgOrbitRoutes()
}
