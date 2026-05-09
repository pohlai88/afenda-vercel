import "server-only"

import { and, eq, lte, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  oneThing,
  oneThingAttachment,
  oneThingComment,
  oneThingList,
} from "#lib/db/schema"

import { ONETHING_DEFAULT_LIST_SLUG } from "../constants"
import type {
  OneThingCounterparty,
  OneThingImpact,
  OneThingLinkage,
  OneThingProvenance,
} from "../types"

/** Optional atom spokes accepted by `insert*OneThing` callers. All four are nullable. */
export type OneThingAtomSeed = {
  linkage?: OneThingLinkage | null
  counterparty?: OneThingCounterparty | null
  provenance?: OneThingProvenance | null
  impact?: OneThingImpact | null
}

export async function ensureDefaultOneThingListForOrg(
  organizationId: string
): Promise<string> {
  const [created] = await db
    .insert(oneThingList)
    .values({
      organizationId,
      ownerUserId: null,
      name: "Inbox",
      slug: ONETHING_DEFAULT_LIST_SLUG,
    })
    .onConflictDoNothing()
    .returning({ id: oneThingList.id })

  if (created) return created.id

  // Conflict: a concurrent request already inserted the default list.
  const [existing] = await db
    .select({ id: oneThingList.id })
    .from(oneThingList)
    .where(
      and(
        eq(oneThingList.organizationId, organizationId),
        eq(oneThingList.slug, ONETHING_DEFAULT_LIST_SLUG),
        sql`${oneThingList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  if (!existing)
    throw new Error("onething default list not found after conflict")
  return existing.id
}

export async function ensureDefaultOneThingListForUser(
  ownerUserId: string
): Promise<string> {
  const [created] = await db
    .insert(oneThingList)
    .values({
      organizationId: null,
      ownerUserId,
      name: "Inbox",
      slug: ONETHING_DEFAULT_LIST_SLUG,
    })
    .onConflictDoNothing()
    .returning({ id: oneThingList.id })

  if (created) return created.id

  // Conflict: a concurrent request already inserted the default list.
  const [existing] = await db
    .select({ id: oneThingList.id })
    .from(oneThingList)
    .where(
      and(
        eq(oneThingList.ownerUserId, ownerUserId),
        eq(oneThingList.slug, ONETHING_DEFAULT_LIST_SLUG),
        sql`${oneThingList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  if (!existing)
    throw new Error("onething default list not found after conflict")
  return existing.id
}

export async function insertOrgOneThing(
  input: {
    listId: string
    organizationId: string
    title: string
    consequence: string
    severity: string
    dueAt: Date | null
    assigneeUserId: string | null
    recurrenceRule: string | null
  } & OneThingAtomSeed
): Promise<{ id: string }> {
  const [row] = await db
    .insert(oneThing)
    .values({
      listId: input.listId,
      organizationId: input.organizationId,
      ownerUserId: null,
      title: input.title,
      consequence: input.consequence,
      severity: input.severity,
      dueAt: input.dueAt,
      assigneeUserId: input.assigneeUserId,
      recurrenceRule: input.recurrenceRule,
      state: input.assigneeUserId ? "owned" : "detected",
      linkage: input.linkage ?? null,
      counterparty: input.counterparty ?? null,
      provenance: input.provenance ?? null,
      impact: input.impact ?? null,
    })
    .returning({ id: oneThing.id })

  if (!row) throw new Error("onething insert returned no row")
  return { id: row.id }
}

export async function insertPersonalOneThing(
  input: {
    listId: string
    ownerUserId: string
    title: string
    consequence: string
    severity: string
    dueAt: Date | null
  } & OneThingAtomSeed
): Promise<{ id: string }> {
  const [row] = await db
    .insert(oneThing)
    .values({
      listId: input.listId,
      organizationId: null,
      ownerUserId: input.ownerUserId,
      title: input.title,
      consequence: input.consequence,
      severity: input.severity,
      dueAt: input.dueAt,
      state: "detected",
      linkage: input.linkage ?? null,
      counterparty: input.counterparty ?? null,
      provenance: input.provenance ?? null,
      impact: input.impact ?? null,
    })
    .returning({ id: oneThing.id })

  if (!row) throw new Error("onething insert returned no row")
  return { id: row.id }
}

export async function updateOneThingState(
  oneThingId: string,
  patch: Partial<{
    state: string
    snoozeUntil: Date | null
    updatedAt: Date
  }>
): Promise<void> {
  await db
    .update(oneThing)
    .set({ ...patch, updatedAt: patch.updatedAt ?? new Date() })
    .where(eq(oneThing.id, oneThingId))
}

export async function deleteOneThingById(oneThingId: string): Promise<void> {
  await db.delete(oneThing).where(eq(oneThing.id, oneThingId))
}

export async function insertOneThingComment(input: {
  oneThingId: string
  authorUserId: string
  body: string
}): Promise<void> {
  await db.insert(oneThingComment).values({
    oneThingId: input.oneThingId,
    authorUserId: input.authorUserId,
    body: input.body,
  })
}

export async function insertOneThingAttachment(input: {
  oneThingId: string
  url: string
  contentSha256: string
  mimeType: string
  sizeBytes: number
}): Promise<void> {
  await db.insert(oneThingAttachment).values({
    oneThingId: input.oneThingId,
    url: input.url,
    contentSha256: input.contentSha256,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  })
}

export async function setOneThingListShareTokenHash(
  listId: string,
  organizationId: string,
  shareTokenHash: string | null
): Promise<void> {
  await db
    .update(oneThingList)
    .set({ shareTokenHash, updatedAt: new Date() })
    .where(
      and(
        eq(oneThingList.id, listId),
        eq(oneThingList.organizationId, organizationId)
      )
    )
}

export async function archiveOneThingListForOrg(
  organizationId: string,
  listId: string
): Promise<void> {
  await db
    .update(oneThingList)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(oneThingList.id, listId),
        eq(oneThingList.organizationId, organizationId)
      )
    )
}

/**
 * Creates the next recurring instance after completion (workflow / inline).
 * Optionally carries the source atom's spokes forward and stamps `provenance`
 * as `cron` so the canvas can mark recurring copies without guessing.
 */
export async function insertOrgOneThingRecurrenceCopy(
  input: {
    listId: string
    organizationId: string
    title: string
    consequence: string
    severity: string
    dueAt: Date | null
    recurrenceRule: string | null
  } & OneThingAtomSeed
): Promise<{ id: string }> {
  return insertOrgOneThing({
    listId: input.listId,
    organizationId: input.organizationId,
    title: input.title,
    consequence: input.consequence,
    severity: input.severity,
    dueAt: input.dueAt,
    assigneeUserId: null,
    recurrenceRule: input.recurrenceRule,
    linkage: input.linkage ?? null,
    counterparty: input.counterparty ?? null,
    provenance: input.provenance ?? {
      kind: "cron",
      source: "onething-recurrence",
    },
    impact: input.impact ?? null,
  })
}

export async function wakeSnoozedOneThingForOrganization(
  organizationId: string
): Promise<number> {
  const now = new Date()
  const result = await db
    .update(oneThing)
    .set({
      state: "owned",
      snoozeUntil: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(oneThing.organizationId, organizationId),
        eq(oneThing.state, "blocked"),
        sql`${oneThing.snoozeUntil} IS NOT NULL`,
        lte(oneThing.snoozeUntil, now)
      )
    )
    .returning({ id: oneThing.id })

  return result.length
}
