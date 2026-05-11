import type { Route } from "next"

import { accountOrbitPath, organizationOrbitPath } from "../constants"
import {
  revalidateAccountOrbitRoutes,
  revalidateOrgOrbitRoutes,
} from "../data/planner-revalidate.server"

export type PlannerActionScopeKind = "organization" | "personal"

export function readPlannerActionScopeKind(
  formData: FormData
): PlannerActionScopeKind {
  return formData.get("scopeKind") === "personal" ? "personal" : "organization"
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
  return input.scopeKind === "organization" && input.orgSlug
    ? organizationOrbitPath(input.orgSlug, input.surface as never)
    : accountOrbitPath(input.surface as never)
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
  if (scopeKind === "organization") {
    revalidateOrgOrbitRoutes()
    return
  }
  revalidateAccountOrbitRoutes()
}
