import "server-only"

import { cache } from "react"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { railSavedView } from "#lib/db/schema"

import type { WorkbenchId } from "../constants"
import type { RailMemorySavedView } from "../types"
import { viewRowToDto } from "./mappers.shared"

/**
 * Lists saved views for one operator inside one workbench. Same
 * `React.cache` discipline as `listPinnedForUser` — a single SELECT
 * per request even when the rail-slot builder + a future "saved
 * views count" surface both read.
 */
export const listSavedViewsForUser = cache(
  async (input: {
    organizationId: string
    userId: string
    workbenchId: WorkbenchId
  }): Promise<RailMemorySavedView[]> => {
    const rows = await db
      .select()
      .from(railSavedView)
      .where(
        and(
          eq(railSavedView.organizationId, input.organizationId),
          eq(railSavedView.userId, input.userId),
          eq(railSavedView.workbenchId, input.workbenchId)
        )
      )
      .orderBy(asc(railSavedView.rank), asc(railSavedView.createdAt))

    const out: RailMemorySavedView[] = []
    for (const row of rows) {
      const dto = viewRowToDto(row)
      if (dto !== null) out.push(dto)
    }
    return out
  }
)

/** Cap-enforcement read; bypass cache (post-delete-must-see-fresh). */
export async function countSavedViewsForUser(input: {
  organizationId: string
  userId: string
  workbenchId: WorkbenchId
}): Promise<number> {
  const rows = await db
    .select({ id: railSavedView.id })
    .from(railSavedView)
    .where(
      and(
        eq(railSavedView.organizationId, input.organizationId),
        eq(railSavedView.userId, input.userId),
        eq(railSavedView.workbenchId, input.workbenchId)
      )
    )
  return rows.length
}
