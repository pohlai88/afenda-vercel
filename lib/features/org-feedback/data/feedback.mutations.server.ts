import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgFeedbackEvent } from "#lib/db/schema"

export type InsertOrgFeedbackEventInput = {
  organizationId: string
  actorUserId: string
  category: string
  severity: string
  message: string
  path: string | null
  userAgent: string | null
  metadata: string | null
}

export async function insertOrgFeedbackEvent(
  input: InsertOrgFeedbackEventInput
): Promise<string> {
  const [row] = await db
    .insert(orgFeedbackEvent)
    .values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      category: input.category,
      severity: input.severity,
      message: input.message,
      path: input.path,
      userAgent: input.userAgent,
      metadata: input.metadata,
      state: "new",
    })
    .returning({ id: orgFeedbackEvent.id })

  if (!row) {
    throw new Error("insertOrgFeedbackEvent: no row returned")
  }
  return row.id
}

export type TransitionOrgFeedbackMutationInput = {
  id: string
  organizationId: string
  actorUserId: string
  transition: "acknowledge" | "resolve" | "reject"
  resolutionNote: string | null
}

export type TransitionOrgFeedbackMutationResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "invalid_transition" }

export async function transitionOrgFeedbackEventState(
  input: TransitionOrgFeedbackMutationInput
): Promise<TransitionOrgFeedbackMutationResult> {
  const [row] = await db
    .select({ id: orgFeedbackEvent.id, state: orgFeedbackEvent.state })
    .from(orgFeedbackEvent)
    .where(
      and(
        eq(orgFeedbackEvent.id, input.id),
        eq(orgFeedbackEvent.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!row) {
    return { ok: false, code: "not_found" }
  }

  const now = new Date()

  if (input.transition === "acknowledge") {
    if (row.state !== "new") {
      return { ok: false, code: "invalid_transition" }
    }
    await db
      .update(orgFeedbackEvent)
      .set({
        state: "acknowledged",
        acknowledgedByUserId: input.actorUserId,
        acknowledgedAt: now,
      })
      .where(eq(orgFeedbackEvent.id, input.id))
    return { ok: true }
  }

  if (row.state !== "acknowledged") {
    return { ok: false, code: "invalid_transition" }
  }

  if (input.transition === "resolve") {
    await db
      .update(orgFeedbackEvent)
      .set({
        state: "resolved",
        resolvedByUserId: input.actorUserId,
        resolvedAt: now,
        resolutionNote: input.resolutionNote,
      })
      .where(eq(orgFeedbackEvent.id, input.id))
    return { ok: true }
  }

  await db
    .update(orgFeedbackEvent)
    .set({
      state: "rejected",
      resolvedByUserId: input.actorUserId,
      resolvedAt: now,
      resolutionNote: input.resolutionNote,
    })
    .where(eq(orgFeedbackEvent.id, input.id))
  return { ok: true }
}
