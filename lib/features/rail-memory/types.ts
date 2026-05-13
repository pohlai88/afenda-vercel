import type { WorkbenchRailNavIconId } from "#components/workbench/left-nav-rail/workbench-rail.schema"

import type { WorkbenchId } from "./constants"

/**
 * Working Memory Rail — application-layer DTO surface.
 *
 * The Workbench shell schemas (`workbench-rail.schema.ts`) are the
 * **kernel** for what the rail can *render*. The types below are the
 * **DTO** the `rail-memory` module emits on the server side and accepts
 * back from clients. They are intentionally a superset: the DB row
 * carries `createdAt` / `updatedAt` / `rank` columns that the rail UI
 * never renders, and the rail UI renders an `occurredAt` ISO string
 * that the DB stores as a `Date`. Mappers in `data/mappers.shared.ts`
 * are the only legitimate translators between the two — no other module
 * may shape the `WorkbenchRail*` payload directly.
 *
 * Kernel-level conditional density (Phase 3a) means callers must drop
 * empty arrays / zero-count inboxes BEFORE handing the slot to
 * `WorkbenchRail`. The mappers preserve raw counts; the builder layer
 * enforces "omit when empty."
 */

// ---------------------------------------------------------------------------
// Server-side DTOs
// ---------------------------------------------------------------------------

/**
 * One pinned record. `id` is the `rail_pinned_item.id` so unpin /
 * reorder mutations can address a specific row. `rank` is the
 * persisted ordering used by `listPinnedForUser` to sort — clients
 * never need to read it directly, but the discriminator survives the
 * round-trip so reorder mutations can build a stable `(id, rank)`
 * mapping without re-querying.
 */
export type RailMemoryPin = {
  readonly id: string
  readonly workbenchId: WorkbenchId
  readonly resourceType: string
  readonly resourceId: string
  readonly label: string
  readonly href: string
  readonly icon: WorkbenchRailNavIconId | null
  readonly rank: number
  readonly createdAt: Date
}

/** One saved view (named filtered URL inside a workbench). */
export type RailMemorySavedView = {
  readonly id: string
  readonly workbenchId: WorkbenchId
  readonly label: string
  readonly href: string
  readonly icon: WorkbenchRailNavIconId | null
  readonly rank: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * One activity-derived recent visit. `resourceId` is `null` for
 * list-level surfaces (e.g. "Members", "Audit") that have a stable
 * href but no record id.
 */
export type RailMemoryRecent = {
  readonly id: string
  readonly workbenchId: WorkbenchId
  readonly resourceType: string
  readonly resourceId: string | null
  readonly label: string
  readonly href: string
  readonly icon: WorkbenchRailNavIconId | null
  readonly occurredAt: Date
}

// ---------------------------------------------------------------------------
// Server Action result discriminated unions
// ---------------------------------------------------------------------------

/**
 * Doctrinal: expected business outcomes are **return values**, not
 * thrown exceptions (Next.js error handling — `nextjs-best-practices.mdc` §8).
 * Each action exposes a closed `code` set so the UI can branch
 * deterministically on failure modes (cap reached, permission denied,
 * not found, etc.) without parsing free-text messages.
 *
 * The `ok: true` and `ok: false` halves are spelled out as separate
 * named types so each action's success payload can extend the OK
 * shape *without* the `Record<string, never>` "no extra keys"
 * intersection that breaks `{ ok: true }`-with-no-extras returns.
 */
export type RailMemoryActionFailure = {
  readonly ok: false
  readonly code:
    | "validation"
    | "not_found"
    | "permission_denied"
    | "limit_reached"
    | "unexpected"
  readonly message: string
}

export type RailMemoryActionSuccess = {
  readonly ok: true
  readonly code?: never
  readonly message?: never
}

export type RailMemoryActionResult =
  | RailMemoryActionSuccess
  | RailMemoryActionFailure

export type PinRecordResult =
  | (RailMemoryActionSuccess & {
      readonly pinId: string
      readonly alreadyPinned: boolean
    })
  | RailMemoryActionFailure

export type UnpinRecordResult = RailMemoryActionResult

export type ReorderPinsResult =
  | (RailMemoryActionSuccess & { readonly count: number })
  | RailMemoryActionFailure

export type SaveViewResult =
  | (RailMemoryActionSuccess & { readonly viewId: string })
  | RailMemoryActionFailure

export type DeleteViewResult = RailMemoryActionResult

export type UpdateViewResult =
  | (RailMemoryActionSuccess & {
      readonly changed: ReadonlyArray<"label" | "href" | "icon">
    })
  | RailMemoryActionFailure
