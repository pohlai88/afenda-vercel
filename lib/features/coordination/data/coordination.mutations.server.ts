import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import {
  orgCoordinationActivity,
  orgCoordinationContext,
  orgCoordinationOperator,
} from "#lib/db/schema"

import type {
  CoordinationActivityCreateInput,
  CoordinationContextCreateInput,
  CoordinationEvidenceItem,
} from "../types"

function dedupeOperatorIds(
  userId: string,
  operatorUserIds: string[]
): string[] {
  return [...new Set([userId, ...operatorUserIds.filter(Boolean)])]
}

function normalizeBody(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

export async function createCoordinationContext(input: {
  organizationId: string
  actorUserId: string
  data: CoordinationContextCreateInput
}): Promise<{ contextId: string }> {
  const operatorUserIds = dedupeOperatorIds(
    input.actorUserId,
    input.data.operatorUserIds
  )

  const members = await db
    .select({ userId: neonAuthMember.userId })
    .from(neonAuthMember)
    .where(eq(neonAuthMember.organizationId, input.organizationId))

  const allowedIds = new Set(members.map((row) => row.userId))
  if (!operatorUserIds.every((userId) => allowedIds.has(userId))) {
    throw new Error(
      "Selected operators must belong to the current organization"
    )
  }

  const subject = normalizeBody(input.data.subject)
  const body = normalizeBody(input.data.body)

  const result = await db.transaction(async (tx) => {
    const now = new Date()
    const [contextRow] = await tx
      .insert(orgCoordinationContext)
      .values({
        organizationId: input.organizationId,
        createdByUserId: input.actorUserId,
        subject: subject.length > 0 ? subject : null,
        linkedEntityType: input.data.linkedEntityType?.trim() || null,
        linkedEntityId: input.data.linkedEntityId?.trim() || null,
        linkedEntityLabel: input.data.linkedEntityLabel?.trim() || null,
        linkedEntityPath: input.data.linkedEntityPath?.trim() || null,
        lastActivityAt: now,
      })
      .returning({ id: orgCoordinationContext.id })

    await tx.insert(orgCoordinationOperator).values(
      operatorUserIds.map((userId) => ({
        contextId: contextRow.id,
        userId,
        lastReadAt: userId === input.actorUserId ? now : null,
      }))
    )

    if (body.length > 0) {
      const [activityRow] = await tx
        .insert(orgCoordinationActivity)
        .values({
          contextId: contextRow.id,
          organizationId: input.organizationId,
          authorUserId: input.actorUserId,
          kind: "comment",
          body,
          evidence: [],
        })
        .returning({ createdAt: orgCoordinationActivity.createdAt })

      await tx
        .update(orgCoordinationContext)
        .set({
          lastActivityAt: activityRow.createdAt,
          updatedAt: activityRow.createdAt,
        })
        .where(eq(orgCoordinationContext.id, contextRow.id))
    }

    return contextRow
  })

  return { contextId: result.id }
}

export async function addCoordinationActivity(input: {
  organizationId: string
  actorUserId: string
  contextId: string
  data: CoordinationActivityCreateInput
}): Promise<{ activityId: string; createdAt: Date }> {
  const [membershipRow] = await db
    .select({ contextId: orgCoordinationOperator.contextId })
    .from(orgCoordinationOperator)
    .innerJoin(
      orgCoordinationContext,
      eq(orgCoordinationOperator.contextId, orgCoordinationContext.id)
    )
    .where(
      and(
        eq(orgCoordinationOperator.contextId, input.contextId),
        eq(orgCoordinationOperator.userId, input.actorUserId),
        eq(orgCoordinationContext.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!membershipRow) {
    throw new Error("Context not found for current operator")
  }

  const body = normalizeBody(input.data.body)
  const evidence = (input.data.evidence ?? []) as CoordinationEvidenceItem[]
  if (body.length === 0 && evidence.length === 0) {
    throw new Error("Activity requires body or evidence")
  }

  return db.transaction(async (tx) => {
    const [activityRow] = await tx
      .insert(orgCoordinationActivity)
      .values({
        contextId: input.contextId,
        organizationId: input.organizationId,
        authorUserId: input.actorUserId,
        kind: input.data.kind,
        body,
        evidence,
      })
      .returning({
        id: orgCoordinationActivity.id,
        createdAt: orgCoordinationActivity.createdAt,
      })

    await tx
      .update(orgCoordinationContext)
      .set({
        lastActivityAt: activityRow.createdAt,
        updatedAt: activityRow.createdAt,
      })
      .where(eq(orgCoordinationContext.id, input.contextId))

    await tx
      .update(orgCoordinationOperator)
      .set({ lastReadAt: activityRow.createdAt })
      .where(
        and(
          eq(orgCoordinationOperator.contextId, input.contextId),
          eq(orgCoordinationOperator.userId, input.actorUserId)
        )
      )

    return {
      activityId: activityRow.id,
      createdAt: activityRow.createdAt,
    }
  })
}

export async function markCoordinationContextRead(input: {
  organizationId: string
  actorUserId: string
  contextId: string
}): Promise<void> {
  const [membershipRow] = await db
    .select({ contextId: orgCoordinationOperator.contextId })
    .from(orgCoordinationOperator)
    .innerJoin(
      orgCoordinationContext,
      eq(orgCoordinationOperator.contextId, orgCoordinationContext.id)
    )
    .where(
      and(
        eq(orgCoordinationOperator.contextId, input.contextId),
        eq(orgCoordinationOperator.userId, input.actorUserId),
        eq(orgCoordinationContext.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!membershipRow) {
    throw new Error("Context not found for current operator")
  }

  await db
    .update(orgCoordinationOperator)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(orgCoordinationOperator.contextId, input.contextId),
        eq(orgCoordinationOperator.userId, input.actorUserId)
      )
    )
}
