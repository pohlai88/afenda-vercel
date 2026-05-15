import "server-only"

import { cache } from "react"

import {
  getRegisteredScopes,
  registerOperationalScope,
} from "#lib/erp/operational-scope-registry.shared"
import type {
  ResolvedOperationalContext,
  ResolvedOperationalScope,
} from "#lib/erp/operational-context.shared"
import {
  listOrgScopePolicies,
  listUserOperationalScopes,
} from "./data/operational-scope.queries.server"
import { routeSegmentProjectId } from "./schemas/operational-scope-route.shared"

// ---------------------------------------------------------------------------
// v1 scope registrations
// All registrations run as module side-effects on first import of this barrel.
// Future ERP modules (HRM, Inventory, Accounting…) call registerOperationalScope
// from their own server.ts barrels.
// ---------------------------------------------------------------------------

registerOperationalScope({
  scopeType: "project",
  label: "Project",
  iconName: "FolderKanban",
  module: "planner",
  available: true,
  routeMatcher: (segments) => routeSegmentProjectId(segments),
})

registerOperationalScope({
  scopeType: "period",
  label: "Period",
  iconName: "CalendarRange",
  module: "planner",
  available: true,
})

registerOperationalScope({
  scopeType: "team",
  label: "Team",
  iconName: "Users",
  module: "hrm",
  available: true,
})

registerOperationalScope({
  scopeType: "cost_center",
  label: "Cost Centre",
  iconName: "Landmark",
  module: "accounting",
  available: false,
})

registerOperationalScope({
  scopeType: "region",
  label: "Region",
  iconName: "MapPin",
  module: "org",
  available: false,
})

registerOperationalScope({
  scopeType: "warehouse",
  label: "Warehouse",
  iconName: "Warehouse",
  module: "inventory",
  available: false,
})

// ---------------------------------------------------------------------------
// Canonical resolver — ADR-0019 §2.6
// Precedence: route (1) > workflow (2) > user (3) > policy mandate (4) > default (5)
//
// Wrapped in React `cache()` so org layout + utility bar row dedupe within one
// request (same orgId, userId, routeSegmentsJson).
// ---------------------------------------------------------------------------

async function resolveOperationalContextImpl(
  organizationId: string,
  userId: string,
  routeSegments: ReadonlyArray<{ key: string; value: string }>
): Promise<ResolvedOperationalContext> {
  const [orgPolicies, userScopes] = await Promise.all([
    listOrgScopePolicies(organizationId),
    listUserOperationalScopes(organizationId, userId),
  ])

  const registry = getRegisteredScopes()
  const scopes: Record<string, ResolvedOperationalScope> = {}

  const userScopeMap = new Map(userScopes.map((s) => [s.scopeType, s]))
  const orgPolicyMap = new Map(orgPolicies.map((p) => [p.scopeType, p]))

  for (const [scopeType, def] of registry) {
    if (!def.available) continue

    const orgPolicy = orgPolicyMap.get(scopeType)
    if (orgPolicy?.policy === "blocked") continue

    const userScope = userScopeMap.get(scopeType)

    const rawRouteId = def.routeMatcher?.(routeSegments) ?? null
    const routeId =
      typeof rawRouteId === "string" && rawRouteId.length > 0 ? rawRouteId : null
    if (routeId !== null) {
      scopes[scopeType] = {
        scopeType,
        selectedId: routeId,
        selectedLabel: userScope?.selectedLabel ?? null,
        selectedSlug: userScope?.selectedSlug ?? null,
        source: "route",
        authority: "system",
        pinned: userScope?.pinned ?? false,
        displayOrder: userScope?.displayOrder ?? orgPolicy?.displayOrder ?? 0,
      }
      continue
    }

    // Priority 2 — workflow (not yet wired; reserved for Phase 4).

    if (userScope?.pinned && userScope.selectedId !== null) {
      scopes[scopeType] = {
        scopeType,
        selectedId: userScope.selectedId,
        selectedLabel: userScope.selectedLabel,
        selectedSlug: userScope.selectedSlug,
        source: "user",
        authority: "user",
        pinned: true,
        displayOrder: userScope.displayOrder,
      }
      continue
    }

    if (orgPolicy?.policy === "mandatory") {
      scopes[scopeType] = {
        scopeType,
        selectedId: userScope?.selectedId ?? null,
        selectedLabel: userScope?.selectedLabel ?? null,
        selectedSlug: userScope?.selectedSlug ?? null,
        source: "policy",
        authority: "admin",
        pinned: true,
        displayOrder: orgPolicy.displayOrder,
      }
      continue
    }

    if (userScope?.pinned) {
      scopes[scopeType] = {
        scopeType,
        selectedId: null,
        selectedLabel: null,
        selectedSlug: null,
        source: "user",
        authority: "user",
        pinned: true,
        displayOrder: userScope.displayOrder,
      }
    }
  }

  return {
    organizationId,
    userId,
    scopes,
    resolvedAt: new Date().toISOString(),
  }
}

/**
 * @param routeSegmentsJson JSON.stringify(ReadonlyArray<{ key, value }>) — stable cache key.
 */
export const resolveOperationalContext = cache(
  async (
    organizationId: string,
    userId: string,
    routeSegmentsJson = "[]"
  ): Promise<ResolvedOperationalContext> => {
    let routeSegments: ReadonlyArray<{ key: string; value: string }> = []
    try {
      const parsed: unknown = JSON.parse(routeSegmentsJson)
      if (Array.isArray(parsed)) {
        routeSegments = parsed as { key: string; value: string }[]
      }
    } catch {
      routeSegments = []
    }
    return resolveOperationalContextImpl(organizationId, userId, routeSegments)
  }
)

// Re-export query helpers for admin pages and Server Action guards.
export {
  listOrgScopePolicies,
  listUserOperationalScopes,
} from "./data/operational-scope.queries.server"

export { setOrgScopePolicyAction } from "./actions/admin-scope-policy.actions"
export {
  pinScopeAction,
  unpinScopeAction,
  setUserScopeSelectionAction,
} from "./actions/user-scope.actions"
