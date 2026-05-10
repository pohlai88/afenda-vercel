import "server-only"

import { asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThingAttachment } from "#lib/db/schema"

export type IThinkAttachment = {
  id: string
  url: string
  mimeType: string
  sizeBytes: number
  createdAt: Date
}

export async function listIThinkAttachments(
  oneThingId: string
): Promise<IThinkAttachment[]> {
  return db
    .select({
      id: oneThingAttachment.id,
      url: oneThingAttachment.url,
      mimeType: oneThingAttachment.mimeType,
      sizeBytes: oneThingAttachment.sizeBytes,
      createdAt: oneThingAttachment.createdAt,
    })
    .from(oneThingAttachment)
    .where(eq(oneThingAttachment.oneThingId, oneThingId))
    .orderBy(asc(oneThingAttachment.createdAt))
}
