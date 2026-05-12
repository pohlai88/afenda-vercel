import "server-only"

import { and, eq, inArray, max as drizzleMax } from "drizzle-orm"

import { db } from "#lib/db"
import { railPinnedItem } from "#lib/db/schema"

import type { WorkbenchId } from "../constants"

/**
 * Pin DB primitives — narrow, transactional, no tenant guard.
 *
 * The Server Actions in `actions/pin.actions.ts` own `requireOrgSession`
 * + rate / cap / audit logic and call these primitives with already-
 * trusted `(organizationId, userId)` tuples. Keeping the primitives
 * guard-free lets unit tests exercise the data layer without spinning
 * up a session, and lets a future migration-time backfill reuse the
 * same INSERT shape from outside the request graph.
 *
 * **IDOR contract.** Every primitive that takes a row id MUST also take
 * `organizationId` + `userId` and scope its WHERE clause by all three.
 * A leaked pin id from another tenant is then a silent no-op rather
 * than a cross-tenant write — matches `AGENTS.md §5 — Tenant ID and
 * IDOR` precisely.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads the next `rank` for an insert — one greater than the current
 * max, so a new pin lands at the *bottom* of the operator's list.
 * Doctrinal: humans expect their newest pin to appear at the end of an
 * ordered list, then optionally drag it up. The alternative ("rank
 * `min - 1`") would top-spike unfamiliar items into the operator's
 * focus, which is the opposite of the Working Memory Rail's calm
 * contract.
 *
 * Returns `0` for the empty-list case (no `MAX` row).
 */
async function nextRankFor(input: {
  organizationId: string
  userId: string
  workbenchId: WorkbenchId
}): Promise<number> {
  const rows = await db
    .select({ maxRank: drizzleMax(railPinnedItem.rank) })
    .from(railPinnedItem)
    .where(
      and(
        eq(railPinnedItem.organizationId, input.organizationId),
        eq(railPinnedItem.userId, input.userId),
        eq(railPinnedItem.workbenchId, input.workbenchId)
      )
    )
  const current = rows[0]?.maxRank
  return typeof current === "number" ? current + 1 : 0
}

// ---------------------------------------------------------------------------
// Existence check — drives the `alreadyPinned` discriminator
// ---------------------------------------------------------------------------

/**
 * Looks up an existing pin row for the same `(org, user, workbench,
 * resourceType, resourceId)` tuple. Used by `pinRecordAction` so a
 * second pin attempt on the same record returns `{ alreadyPinned: true,
 * pinId }` instead of throwing on the unique-index violation. Indexed
 * by `rail_pinned_item_user_resource_uidx`.
 */
export async function findExistingPin(input: {
  organizationId: string
  userId: string
  workbenchId: WorkbenchId
  resourceType: string
  resourceId: string
}): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: railPinnedItem.id })
    .from(railPinnedItem)
    .where(
      and(
        eq(railPinnedItem.organizationId, input.organizationId),
        eq(railPinnedItem.userId, input.userId),
        eq(railPinnedItem.workbenchId, input.workbenchId),
        eq(railPinnedItem.resourceType, input.resourceType),
        eq(railPinnedItem.resourceId, input.resourceId)
      )
    )
    .limit(1)
  const row = rows[0]
  return row ? { id: row.id } : null
}

// ---------------------------------------------------------------------------
// Insert
// ---------------------------------------------------------------------------

export async function insertPin(input: {
  organizationId: string
  userId: string
  workbenchId: WorkbenchId
  resourceType: string
  resourceId: string
  label: string
  href: string
  icon?: string
}): Promise<{ id: string; rank: number }> {
  const id = crypto.randomUUID()
  const rank = await nextRankFor(input)
  await db.insert(railPinnedItem).values({
    id,
    organizationId: input.organizationId,
    userId: input.userId,
    workbenchId: input.workbenchId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    label: input.label,
    href: input.href,
    icon: input.icon ?? null,
    rank,
  })
  return { id, rank }
}

// ---------------------------------------------------------------------------
// Delete — IDOR-safe (scoped by org + user + pinId)
// ---------------------------------------------------------------------------

/**
 * Deleted-pin metadata — captured from `RETURNING` so the action layer
 * can write an audit row without a second SELECT. Workbench id is
 * `text` here (DB column type), narrowed by the action via
 * `isWorkbenchId` before being passed to revalidation.
 */
export type DeletedPin = {
  readonly id: string
  readonly workbenchId: string
  readonly resourceType: string
  readonly resourceId: string
  readonly label: string
}

/**
 * Deletes a pin by id, scoped to `(organizationId, userId)`. Returns
 * the deleted-row metadata on hit, `null` when the id was not found in
 * this operator's pin set (whether stale, deleted in a parallel
 * request, or belonging to another tenant — all three cases collapse
 * to the same "not found" semantics so leak attempts learn nothing).
 *
 * Using `.returning(...)` to capture audit metadata in the same round
 * trip — same primitive Drizzle pattern as `members.mutations` /
 * `integrations-endpoints.mutations`.
 */
export async function deletePin(input: {
  organizationId: string
  userId: string
  pinId: string
}): Promise<DeletedPin | null> {
  const deleted = await db
    .delete(railPinnedItem)
    .where(
      and(
        eq(railPinnedItem.id, input.pinId),
        eq(railPinnedItem.organizationId, input.organizationId),
        eq(railPinnedItem.userId, input.userId)
      )
    )
    .returning({
      id: railPinnedItem.id,
      workbenchId: railPinnedItem.workbenchId,
      resourceType: railPinnedItem.resourceType,
      resourceId: railPinnedItem.resourceId,
      label: railPinnedItem.label,
    })
  return deleted[0] ?? null
}

// ---------------------------------------------------------------------------
// Reorder — full permutation only
// ---------------------------------------------------------------------------

/**
 * Rewrites the rank of every pin in the caller's
 * `(org, user, workbench)` tuple in one transaction. Accepts the full
 * ordered list of pin ids and emits an UPDATE per id with the new
 * rank. The action layer verifies the input is a permutation of the
 * current set before calling this primitive — partial reorders are
 * doctrinally forbidden (they would otherwise leave rank gaps that
 * subsequent inserts trip over).
 *
 * Returns the number of rows actually updated so the action can
 * surface a `not_found` when the input id set drifts from the live
 * pin set between read and write (rare, but possible across two
 * browser tabs).
 *
 * **Transactional**: each UPDATE is per-id; the whole reorder is one
 * Drizzle batch so an interrupted write leaves the previous state
 * intact. Neon HTTP supports `transaction()` per `drizzle-orm` docs.
 */
export async function reorderPins(input: {
  organizationId: string
  userId: string
  workbenchId: WorkbenchId
  orderedPinIds: ReadonlyArray<string>
}): Promise<{ updated: number }> {
  if (input.orderedPinIds.length === 0) return { updated: 0 }

  return db.transaction(async (tx) => {
    // Verify every id belongs to the caller's pin set before any write.
    // If a single id is foreign or stale, the whole reorder aborts.
    const owned = await tx
      .select({ id: railPinnedItem.id })
      .from(railPinnedItem)
      .where(
        and(
          eq(railPinnedItem.organizationId, input.organizationId),
          eq(railPinnedItem.userId, input.userId),
          eq(railPinnedItem.workbenchId, input.workbenchId),
          inArray(railPinnedItem.id, [...input.orderedPinIds])
        )
      )
    if (owned.length !== input.orderedPinIds.length) {
      return { updated: 0 }
    }

    let updated = 0
    for (let i = 0; i < input.orderedPinIds.length; i += 1) {
      const pinId = input.orderedPinIds[i]
      if (!pinId) continue
      const result = await tx
        .update(railPinnedItem)
        .set({ rank: i, updatedAt: new Date() })
        .where(
          and(
            eq(railPinnedItem.id, pinId),
            eq(railPinnedItem.organizationId, input.organizationId),
            eq(railPinnedItem.userId, input.userId),
            eq(railPinnedItem.workbenchId, input.workbenchId)
          )
        )
        .returning({ id: railPinnedItem.id })
      updated += result.length
    }
    return { updated }
  })
}
