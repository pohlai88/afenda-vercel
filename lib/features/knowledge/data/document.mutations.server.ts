import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeDocument } from "#lib/db/schema"

export async function getKnowledgeDocumentBySourceExternalId(args: {
  sourceId: string
  externalId: string
}) {
  const [row] = await db
    .select({
      id: knowledgeDocument.id,
      inputDigest: knowledgeDocument.inputDigest,
    })
    .from(knowledgeDocument)
    .where(
      and(
        eq(knowledgeDocument.sourceId, args.sourceId),
        eq(knowledgeDocument.externalId, args.externalId)
      )
    )
    .limit(1)
  return row ?? null
}
