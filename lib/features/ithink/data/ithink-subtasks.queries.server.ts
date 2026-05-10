import "server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"

import { ITHINK_ACTIVE_STATES } from "../constants"
import {
  hydrateIThinkRow,
  ITHINK_ROW_SELECT,
  type RawIThinkDbRow,
} from "./ithink.queries.server"
import type { IThinkRow } from "../types"

export async function listIThinkSubtasks(
  parentId: string,
  organizationId: string
): Promise<IThinkRow[]> {
  const rows = await db
    .select(ITHINK_ROW_SELECT)
    .from(oneThing)
    .where(
      and(
        eq(oneThing.parentOneThingId, parentId),
        eq(oneThing.organizationId, organizationId),
        inArray(oneThing.state, [...ITHINK_ACTIVE_STATES])
      )
    )
    .orderBy(asc(oneThing.createdAt))
  return rows.map((r) => hydrateIThinkRow(r as RawIThinkDbRow))
}
