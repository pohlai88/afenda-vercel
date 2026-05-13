import type {
  OrbitDashboardSurface,
  OrbitPageData,
  PlannerSurfaceRecordKind,
} from "../types"

export type OrbitKeyboardNavEntry = {
  kind: PlannerSurfaceRecordKind
  id: string
}

/** Row order matches `OrbitPage` list rendering (for j/k focus navigation). */
export function buildOrbitKeyboardNavList(
  surface: OrbitDashboardSurface,
  page: Pick<OrbitPageData, "items" | "signals" | "sessions" | "links">
): OrbitKeyboardNavEntry[] {
  if (surface === "signals") {
    return page.signals.map((s) => ({ kind: "signal", id: s.id }))
  }
  if (surface === "sessions") {
    return page.sessions.map((s) => ({ kind: "session", id: s.id }))
  }
  if (surface === "links") {
    return page.links.map((l) => ({ kind: "link", id: l.id }))
  }
  if (surface === "triage") {
    return [
      ...page.items.map((i) => ({ kind: "item" as const, id: i.id })),
      ...page.signals.map((s) => ({ kind: "signal" as const, id: s.id })),
    ]
  }
  return page.items.map((i) => ({ kind: "item", id: i.id }))
}
