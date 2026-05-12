import "server-only"

import { cache } from "react"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { railPinnedItem } from "#lib/db/schema"

import type { WorkbenchId } from "../constants"
import type { RailMemoryPin } from "../types"
import { pinRowToDto } from "./mappers.shared"

/**
 * Lists pinned records for one operator inside one workbench.
 *
 * Wrapped in `React.cache` so any RSC subtree that reads the same
 * (org, user, workbench) tuple inside the same request shares a
 * single SELECT — the rail-slot builder + a future "pinned count"
 * badge would otherwise issue two identical queries against the same
 * indexed lookup. Same dedupe pattern as `requireOrgSession`.
 *
 * Sort discipline: `rank ASC` is the operator-controlled order;
 * `createdAt ASC` is the deterministic tiebreaker so two pins with
 * the same rank (e.g. before the first reorder) render in insertion
 * order, not row-id order.
 *
 * Returns DTOs (not slot shapes) — the rail-slot builder calls
 * `pinDtoToSlot` to cross the RSC → client boundary so the kernel
 * parser stays the only authoritative validator at that frontier.
 */
export const listPinnedForUser = cache(
  async (input: {
    organizationId: string
    userId: string
    workbenchId: WorkbenchId
  }): Promise<RailMemoryPin[]> => {
    const rows = await db
      .select()
      .from(railPinnedItem)
      .where(
        and(
          eq(railPinnedItem.organizationId, input.organizationId),
          eq(railPinnedItem.userId, input.userId),
          eq(railPinnedItem.workbenchId, input.workbenchId)
        )
      )
      .orderBy(asc(railPinnedItem.rank), asc(railPinnedItem.createdAt))

    const out: RailMemoryPin[] = []
    for (const row of rows) {
      const dto = pinRowToDto(row)
      // Self-healing: rows with a `workbenchId` outside the typed
      // union silently disappear — see `mappers.shared.ts` rationale.
      if (dto !== null) out.push(dto)
    }
    return out
  }
)

/**
 * Read-side helper for the pin-cap enforcement in
 * `pinRecordAction` — bypasses the cache because the action MAY have
 * just deleted a pin and the count must reflect the post-delete
 * state. Single-purpose; not exported via the public barrel.
 */
export async function countPinsForUser(input: {
  organizationId: string
  userId: string
  workbenchId: WorkbenchId
}): Promise<number> {
  const rows = await db
    .select({ id: railPinnedItem.id })
    .from(railPinnedItem)
    .where(
      and(
        eq(railPinnedItem.organizationId, input.organizationId),
        eq(railPinnedItem.userId, input.userId),
        eq(railPinnedItem.workbenchId, input.workbenchId)
      )
    )
  return rows.length
}
