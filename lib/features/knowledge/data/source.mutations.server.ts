import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeSource } from "#lib/db/schema"

export async function insertKnowledgeSource(args: {
  organizationId: string
  kind: string
  name: string
  config: Record<string, unknown>
  enabled: boolean
  createdByUserId: string
}) {
  const [row] = await db
    .insert(knowledgeSource)
    .values({
      organizationId: args.organizationId,
      kind: args.kind,
      name: args.name,
      config: args.config,
      enabled: args.enabled,
      createdByUserId: args.createdByUserId,
    })
    .returning({ id: knowledgeSource.id })
  return row
}

export async function updateKnowledgeSourceForOrganization(args: {
  organizationId: string
  sourceId: string
  name: string
  config: Record<string, unknown>
  enabled: boolean
}) {
  const [row] = await db
    .update(knowledgeSource)
    .set({
      name: args.name,
      config: args.config,
      enabled: args.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(knowledgeSource.organizationId, args.organizationId),
        eq(knowledgeSource.id, args.sourceId)
      )
    )
    .returning({ id: knowledgeSource.id })
  return row ?? null
}

export async function setKnowledgeSourceEnabled(args: {
  organizationId: string
  sourceId: string
  enabled: boolean
}) {
  const [row] = await db
    .update(knowledgeSource)
    .set({
      enabled: args.enabled,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(knowledgeSource.organizationId, args.organizationId),
        eq(knowledgeSource.id, args.sourceId)
      )
    )
    .returning({ id: knowledgeSource.id })
  return row ?? null
}

export async function deleteKnowledgeSourceForOrganization(args: {
  organizationId: string
  sourceId: string
}) {
  const [row] = await db
    .delete(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.organizationId, args.organizationId),
        eq(knowledgeSource.id, args.sourceId)
      )
    )
    .returning({ id: knowledgeSource.id })
  return row ?? null
}

export async function touchKnowledgeSourceLastSyncedAt(args: {
  organizationId: string
  sourceId: string
  at: Date
}) {
  await db
    .update(knowledgeSource)
    .set({ lastSyncedAt: args.at, updatedAt: args.at })
    .where(
      and(
        eq(knowledgeSource.organizationId, args.organizationId),
        eq(knowledgeSource.id, args.sourceId)
      )
    )
}

export async function getOrCreateManualKnowledgeSource(args: {
  organizationId: string
  createdByUserId: string
}) {
  const [existing] = await db
    .select({ id: knowledgeSource.id })
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.organizationId, args.organizationId),
        eq(knowledgeSource.kind, "manual"),
        eq(knowledgeSource.name, "Manual entries")
      )
    )
    .limit(1)
  if (existing) return existing.id
  const [created] = await db
    .insert(knowledgeSource)
    .values({
      organizationId: args.organizationId,
      kind: "manual",
      name: "Manual entries",
      config: {},
      enabled: true,
      createdByUserId: args.createdByUserId,
    })
    .returning({ id: knowledgeSource.id })
  return created.id
}
