import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeSource } from "#lib/db/schema"

import type { KnowledgeSourceSummary } from "#features/knowledge/types"

export async function listKnowledgeSourcesForOrganization(
  organizationId: string
): Promise<KnowledgeSourceSummary[]> {
  const rows = await db
    .select()
    .from(knowledgeSource)
    .where(eq(knowledgeSource.organizationId, organizationId))
    .orderBy(asc(knowledgeSource.createdAt))
  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    kind: row.kind,
    name: row.name,
    config: row.config,
    enabled: row.enabled,
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

export async function getKnowledgeSourceForOrganization(
  organizationId: string,
  sourceId: string
) {
  const [row] = await db
    .select()
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.organizationId, organizationId),
        eq(knowledgeSource.id, sourceId)
      )
    )
    .limit(1)
  return row ?? null
}

export async function listEnabledKnowledgeSourceRefs() {
  return db
    .select({
      sourceId: knowledgeSource.id,
      organizationId: knowledgeSource.organizationId,
      createdByUserId: knowledgeSource.createdByUserId,
    })
    .from(knowledgeSource)
    .where(eq(knowledgeSource.enabled, true))
}
