import "server-only"

import { createHash } from "node:crypto"

import { revalidateTag } from "next/cache"
import { after } from "next/server"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { knowledgeChunk, knowledgeDocument } from "#lib/db/schema"

import { KNOWLEDGE_AUDIT_ACTIONS } from "#features/knowledge/constants"
import type { RawKnowledgeDocument } from "#features/knowledge/types"

import { and, eq } from "drizzle-orm"
import { getKnowledgeDocumentBySourceExternalId } from "./document.mutations.server"
import { embedKnowledgeBatch } from "./pipeline-embed-batch.server"
import { chunkKnowledgeDocument } from "./pipeline-chunker.shared"

function digestCanonicalDocument(doc: RawKnowledgeDocument): string {
  const canonical = JSON.stringify({
    externalId: doc.externalId,
    title: doc.title,
    body: doc.body,
  })
  return createHash("sha256").update(canonical, "utf8").digest("hex")
}

function orgKnowledgeTag(organizationId: string): string {
  return `org:${organizationId}:knowledge:chunks`
}

export async function commitKnowledgeDocument(args: {
  organizationId: string
  sourceId: string
  actorUserId: string
  actorSessionId: string
  document: RawKnowledgeDocument
  enforceZdr?: boolean
}): Promise<{ changed: boolean; documentId?: string }> {
  const inputDigest = digestCanonicalDocument(args.document)
  const existing = await getKnowledgeDocumentBySourceExternalId({
    sourceId: args.sourceId,
    externalId: args.document.externalId,
  })
  if (existing?.inputDigest === inputDigest) {
    return { changed: false, documentId: existing.id }
  }

  const chunks = chunkKnowledgeDocument({
    title: args.document.title,
    body: args.document.body,
  })

  const { vectors, embeddingModelVersion } = await embedKnowledgeBatch(
    args.organizationId,
    chunks.map((chunk) => chunk.body),
    { enforceZdr: args.enforceZdr }
  )

  const documentId = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: knowledgeDocument.id })
      .from(knowledgeDocument)
      .where(
        and(
          eq(knowledgeDocument.sourceId, args.sourceId),
          eq(knowledgeDocument.externalId, args.document.externalId)
        )
      )
      .limit(1)
    const existingId = existing[0]?.id ?? null
    if (existingId) {
      await tx
        .delete(knowledgeChunk)
        .where(eq(knowledgeChunk.documentId, existingId))
    }
    const [documentRow] = existingId
      ? await tx
          .update(knowledgeDocument)
          .set({
            title: args.document.title,
            body: args.document.body,
            inputDigest,
            tokenCount: chunks.reduce(
              (acc, chunk) => acc + chunk.tokenCount,
              0
            ),
            embeddingModelVersion,
            lastEmbeddedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(knowledgeDocument.id, existingId))
          .returning({ id: knowledgeDocument.id })
      : await tx
          .insert(knowledgeDocument)
          .values({
            organizationId: args.organizationId,
            sourceId: args.sourceId,
            externalId: args.document.externalId,
            title: args.document.title,
            body: args.document.body,
            inputDigest,
            tokenCount: chunks.reduce(
              (acc, chunk) => acc + chunk.tokenCount,
              0
            ),
            embeddingModelVersion,
            lastEmbeddedAt: new Date(),
          })
          .returning({ id: knowledgeDocument.id })

    if (chunks.length > 0) {
      await tx.insert(knowledgeChunk).values(
        chunks.map((chunk, idx) => ({
          organizationId: args.organizationId,
          documentId: documentRow.id,
          chunkIndex: chunk.index,
          tokenCount: chunk.tokenCount,
          embeddingModelVersion,
          title: chunk.title,
          body: chunk.body,
          embedding: vectors[idx]!,
          createdByUserId: args.actorUserId,
        }))
      )
    }

    return documentRow.id
  })

  revalidateTag(orgKnowledgeTag(args.organizationId), "max")

  after(() =>
    writeIamAuditEvent({
      action: KNOWLEDGE_AUDIT_ACTIONS.DOCUMENT_EMBED_COMPLETED,
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      actorSessionId: args.actorSessionId,
      resourceType: "knowledge.document",
      resourceId: documentId,
      metadata: {
        sourceId: args.sourceId,
        chunks: chunks.length,
        embeddingModelVersion,
      },
    })
  )

  return { changed: true, documentId }
}
