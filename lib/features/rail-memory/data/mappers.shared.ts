import type {
  WorkbenchRailNavIconId,
  WorkbenchRailPin,
  WorkbenchRailRecent,
  WorkbenchRailView,
} from "#components/workbench/rail/workbench-rail.types"

import { isWorkbenchId } from "../constants"
import type {
  RailMemoryPin,
  RailMemoryRecent,
  RailMemorySavedView,
} from "../types"

/**
 * DB row → `RailMemory*` DTO mappers (server-internal) and DTO →
 * kernel `WorkbenchRail*` slot mappers (RSC ↔ client boundary).
 *
 * Pure functions, no DB / headers / clock. Lives under `data/` (not at
 * module root) because callers are exclusively the queries module +
 * rail-slot builders, both of which already touch `data/`. Exporting
 * them via the public barrel would tempt unrelated code to reshape
 * pin / view / recent payloads ad hoc — that's exactly the rail
 * schema drift the kernel doctrine prevents.
 *
 * `WorkbenchRailNavIconId` validation: the DB column is free-form
 * `text` (per the migration design), so the mapper falls back to
 * `null` when the stored value is not a recognized icon id. This is
 * intentional — a stale icon token from before a UI refactor should
 * degrade gracefully (no icon), not crash the rail.
 */

// ---------------------------------------------------------------------------
// Icon coercion — defensive: the DB column is `text`, not enum
// ---------------------------------------------------------------------------

/**
 * Module-internal icon allowlist mirror. We cannot import the kernel
 * `WORKBENCH_RAIL_NAV_ICON_IDS` tuple here without dragging the entire
 * client `WorkbenchRail` graph into server bundles — instead we mirror
 * the *narrow* check ("is it a non-empty string under 64 chars?") and
 * defer the precise enum check to the kernel parser. The mapper
 * returns the icon as-is when it looks plausible; the kernel's
 * `parseWorkbenchRailPin` (called from the RSC layout) is the
 * authoritative gate.
 */
function coerceIcon(raw: string | null): WorkbenchRailNavIconId | null {
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 64) return null
  // Type assertion is safe: the kernel parser at the slot boundary
  // re-validates against the closed enum, so a stale token here just
  // gets rejected during parse rather than crashing the mapper.
  return trimmed as WorkbenchRailNavIconId
}

// ---------------------------------------------------------------------------
// DB row shapes — narrowed structurally so the mappers don't drag in
// the Drizzle type for every column. Keeps the mapper module
// import-graph thin (no `lib/db/schema` dep at runtime).
// ---------------------------------------------------------------------------

type PinRow = {
  id: string
  organizationId: string
  userId: string
  workbenchId: string
  resourceType: string
  resourceId: string
  label: string
  href: string
  icon: string | null
  rank: number
  createdAt: Date
}

type ViewRow = {
  id: string
  organizationId: string
  userId: string
  workbenchId: string
  label: string
  href: string
  icon: string | null
  rank: number
  createdAt: Date
  updatedAt: Date
}

type RecentRow = {
  id: string
  organizationId: string
  userId: string
  workbenchId: string
  resourceType: string
  resourceId: string | null
  label: string
  href: string
  icon: string | null
  occurredAt: Date
}

// ---------------------------------------------------------------------------
// DB row → DTO
// ---------------------------------------------------------------------------

/**
 * Maps a `rail_pinned_item` row to the application DTO. Returns
 * `null` when the stored `workbenchId` is not in the typed union —
 * this is a self-healing read: stale rows from a deleted workbench
 * silently disappear from the rail rather than crashing the request.
 * Cleanup (DELETE WHERE workbench_id NOT IN ...) belongs in a future
 * migration, not in the read path.
 */
export function pinRowToDto(row: PinRow): RailMemoryPin | null {
  if (!isWorkbenchId(row.workbenchId)) return null
  return {
    id: row.id,
    workbenchId: row.workbenchId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    label: row.label,
    href: row.href,
    icon: coerceIcon(row.icon),
    rank: row.rank,
    createdAt: row.createdAt,
  }
}

export function viewRowToDto(row: ViewRow): RailMemorySavedView | null {
  if (!isWorkbenchId(row.workbenchId)) return null
  return {
    id: row.id,
    workbenchId: row.workbenchId,
    label: row.label,
    href: row.href,
    icon: coerceIcon(row.icon),
    rank: row.rank,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function recentRowToDto(row: RecentRow): RailMemoryRecent | null {
  if (!isWorkbenchId(row.workbenchId)) return null
  return {
    id: row.id,
    workbenchId: row.workbenchId,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    label: row.label,
    href: row.href,
    icon: coerceIcon(row.icon),
    occurredAt: row.occurredAt,
  }
}

// ---------------------------------------------------------------------------
// DTO → kernel slot
// ---------------------------------------------------------------------------

export function pinDtoToSlot(pin: RailMemoryPin): WorkbenchRailPin {
  return {
    id: pin.id,
    label: pin.label,
    href: pin.href,
    resourceType: pin.resourceType,
    resourceId: pin.resourceId,
    ...(pin.icon ? { icon: pin.icon } : {}),
  }
}

export function viewDtoToSlot(view: RailMemorySavedView): WorkbenchRailView {
  return {
    id: view.id,
    label: view.label,
    href: view.href,
    ...(view.icon ? { icon: view.icon } : {}),
  }
}

/**
 * Recents cross the RSC → client boundary as JSON-serializable
 * payloads, so `occurredAt` is converted to an ISO 8601 string here.
 * The client renders relative time (`formatDistanceToNow`-style) from
 * this string at hydration time so the server response stays
 * deterministic.
 */
export function recentDtoToSlot(recent: RailMemoryRecent): WorkbenchRailRecent {
  return {
    id: recent.id,
    label: recent.label,
    href: recent.href,
    resourceType: recent.resourceType,
    occurredAt: recent.occurredAt.toISOString(),
    ...(recent.resourceId ? { resourceId: recent.resourceId } : {}),
    ...(recent.icon ? { icon: recent.icon } : {}),
  }
}

// ---------------------------------------------------------------------------
// Recents dedupe — pure, exported for tests
// ---------------------------------------------------------------------------

/**
 * Dedupe the raw recent-visit sample by `(resourceType, resourceId |
 * __list__:href)`, keeping the most-recent occurrence per resource.
 * Input is assumed to be sorted by `occurredAt DESC` (the query
 * guarantees this); the function preserves that ordering in its
 * output so callers can `.slice(0, RAIL_RECENT_SURFACE_LIMIT)`
 * directly.
 *
 * Why dedupe in JS rather than `DISTINCT ON` in SQL: DISTINCT ON
 * works but locks the dedup grouping into the query string, making
 * it hard to evolve (e.g. group by URL canonicalization rules later).
 * The sample size (`RAIL_RECENT_QUERY_LIMIT = 50`) is bounded, so JS
 * dedupe is O(n) with trivial constants.
 *
 * Pure function — exported here (not via `index.ts`) because tests
 * exercise it directly without spinning up Drizzle.
 */
export function dedupeRecents(
  rows: ReadonlyArray<RailMemoryRecent>
): RailMemoryRecent[] {
  const seen = new Set<string>()
  const out: RailMemoryRecent[] = []
  for (const row of rows) {
    const key =
      row.resourceId !== null && row.resourceId.length > 0
        ? `${row.resourceType}:${row.resourceId}`
        : `__list__:${row.href}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}
