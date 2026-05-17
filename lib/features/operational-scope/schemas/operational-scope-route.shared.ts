/**
 * Pure URL → operational scope helpers (client + server safe).
 *
 * Next.js: parent layouts do not re-render on in-tree navigations, so the
 * server snapshot from the app-shell utility bar can lag the URL. Client
 * components merge route-derived dimensions with `mergeRouteOperationalContext`.
 */

import type {
  ResolvedOperationalContext,
  ResolvedOperationalScope,
} from "#lib/erp/operational-context.shared"

export type OperationalRouteSegment = { key: string; value: string }

export function paramsRecordToRouteSegments(
  params: Readonly<Record<string, string | string[] | undefined>>
): OperationalRouteSegment[] {
  const out: OperationalRouteSegment[] = []
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue
    const value = Array.isArray(raw) ? raw.filter(Boolean).join("/") : raw
    if (value.length > 0) out.push({ key, value })
  }
  return out
}

/** v1 — must match server `routeMatcher` for `project` in `server.ts`. */
export function routeSegmentProjectId(
  segments: ReadonlyArray<OperationalRouteSegment>
): string | null {
  const hit = segments.find((s) => s.key === "projectId")
  return hit?.value ?? null
}

export function mergeRouteOperationalContext(
  base: ResolvedOperationalContext,
  segments: ReadonlyArray<OperationalRouteSegment>
): ResolvedOperationalContext {
  const projectId = routeSegmentProjectId(segments)
  const scopes: Record<string, ResolvedOperationalScope> = { ...base.scopes }

  if (projectId) {
    const prev = scopes.project
    scopes.project = {
      scopeType: "project",
      selectedId: projectId,
      selectedLabel: prev?.selectedLabel ?? projectId,
      selectedSlug: prev?.selectedSlug ?? null,
      source: "route",
      authority: "system",
      pinned: prev?.pinned ?? false,
      displayOrder: prev?.displayOrder ?? 0,
    }
  }

  return { ...base, scopes }
}
