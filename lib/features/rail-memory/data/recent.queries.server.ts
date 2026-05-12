import "server-only"

import { cache } from "react"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { railRecentItem } from "#lib/db/schema"

import {
  RAIL_RECENT_QUERY_LIMIT,
  RAIL_RECENT_SURFACE_LIMIT,
} from "../constants"
import type { WorkbenchId } from "../constants"
import type { RailMemoryRecent } from "../types"
import { dedupeRecents, recentRowToDto } from "./mappers.shared"

/**
 * Lists the operator's most-recent visits inside one workbench, after
 * resource-level dedupe (most-recent visit per resource wins). The
 * function returns at most `RAIL_RECENT_SURFACE_LIMIT` rows even when
 * the table has many duplicates — the rail UI never renders the same
 * record twice.
 *
 * Why query 50 then dedupe to 5: keeps dedupe semantics in pure JS
 * (testable, evolvable) while bounding both the network round-trip
 * and the in-process work to operator-scale numbers.
 */
export const listRecentsForUser = cache(
  async (input: {
    organizationId: string
    userId: string
    workbenchId: WorkbenchId
  }): Promise<RailMemoryRecent[]> => {
    const rows = await db
      .select()
      .from(railRecentItem)
      .where(
        and(
          eq(railRecentItem.organizationId, input.organizationId),
          eq(railRecentItem.userId, input.userId),
          eq(railRecentItem.workbenchId, input.workbenchId)
        )
      )
      .orderBy(desc(railRecentItem.occurredAt))
      .limit(RAIL_RECENT_QUERY_LIMIT)

    const dtos: RailMemoryRecent[] = []
    for (const row of rows) {
      const dto = recentRowToDto(row)
      if (dto !== null) dtos.push(dto)
    }

    return dedupeRecents(dtos).slice(0, RAIL_RECENT_SURFACE_LIMIT)
  }
)
