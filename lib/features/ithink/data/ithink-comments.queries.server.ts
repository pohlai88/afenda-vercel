import "server-only"

import { asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThingComment } from "#lib/db/schema"

export type IThinkComment = {
  id: string
  authorUserId: string
  body: string
  createdAt: Date
}

export async function listIThinkComments(
  oneThingId: string
): Promise<IThinkComment[]> {
  return db
    .select({
      id: oneThingComment.id,
      authorUserId: oneThingComment.authorUserId,
      body: oneThingComment.body,
      createdAt: oneThingComment.createdAt,
    })
    .from(oneThingComment)
    .where(eq(oneThingComment.oneThingId, oneThingId))
    .orderBy(asc(oneThingComment.createdAt))
}
