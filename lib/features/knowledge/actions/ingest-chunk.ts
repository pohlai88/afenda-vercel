"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { knowledgeChunk } from "#lib/db/schema"
import { requireErpPermission } from "#features/erp-rbac/server"
import {
  ORG_DASHBOARD_KNOWLEDGE,
  ORG_DASHBOARD_LYNX,
} from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { embedKnowledgeText } from "#features/knowledge/data/embeddings.server"
import { ingestChunkSchema } from "#features/knowledge/schemas/chunk.schema"
import type { IngestChunkFormState } from "#features/knowledge/types"

export async function ingestKnowledgeChunk(
  _prevState: IngestChunkFormState,
  formData: FormData
): Promise<IngestChunkFormState> {
  const gate = await requireErpPermission({
    module: "knowledge",
    object: "chunk",
    function: "create",
  })
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.error } }
  }
  const { organizationId, userId, sessionId } = gate.session

  const parsed = ingestChunkSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        title: fieldErrors.title?.[0],
        body: fieldErrors.body?.[0],
      },
    }
  }

  const textForEmbed = `${parsed.data.title}\n\n${parsed.data.body}`

  let embedding: number[]
  try {
    embedding = await embedKnowledgeText(textForEmbed)
  } catch {
    return {
      ok: false,
      errors: {
        form: "Could not generate embedding. Check AI Gateway credentials and try again.",
      },
    }
  }

  try {
    const [row] = await db
      .insert(knowledgeChunk)
      .values({
        organizationId,
        title: parsed.data.title,
        body: parsed.data.body,
        embedding,
        createdByUserId: userId,
      })
      .returning({ id: knowledgeChunk.id })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: "erp.knowledge.chunk.create",
        organizationId,
        actorUserId: userId,
        actorSessionId: sessionId,
        resourceType: "knowledge.chunk",
        resourceId: row.id,
        metadata: {
          titleLen: parsed.data.title.length,
          bodyLen: parsed.data.body.length,
        },
      })
    )
  } catch {
    return {
      ok: false,
      errors: {
        form: "Could not save chunk. Try again.",
      },
    }
  }

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_KNOWLEDGE),
    "page"
  )
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_LYNX),
    "page"
  )
  return { ok: true }
}
