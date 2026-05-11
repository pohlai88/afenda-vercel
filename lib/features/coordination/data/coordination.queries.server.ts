import "server-only"

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember, neonAuthUser } from "#lib/db/schema-neon-auth"
import {
  orgCoordinationActivity,
  orgCoordinationContext,
  orgCoordinationOperator,
} from "#lib/db/schema"

import type {
  CoordinationActivitySummary,
  CoordinationContextDetail,
  CoordinationContextSummary,
  CoordinationEvidenceItem,
  CoordinationOperatorSummary,
} from "../types"

function normalizeEvidence(value: unknown): CoordinationEvidenceItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
    const blobPathname =
      typeof entry.blobPathname === "string" ? entry.blobPathname : null
    const url = typeof entry.url === "string" ? entry.url : null
    const fileName = typeof entry.fileName === "string" ? entry.fileName : null
    const kind =
      entry.kind === "file" || entry.kind === "screenshot" ? entry.kind : null
    if (!blobPathname || !url || !fileName || !kind) return []
    return [
      {
        blobPathname,
        url,
        downloadUrl:
          typeof entry.downloadUrl === "string" ? entry.downloadUrl : null,
        contentType:
          typeof entry.contentType === "string" ? entry.contentType : null,
        fileName,
        fileSize:
          typeof entry.fileSize === "number"
            ? Math.trunc(entry.fileSize)
            : null,
        kind,
      },
    ]
  })
}

function summarizeContextSubject(input: {
  subject: string | null
  linkedEntityLabel: string | null
  operatorEmails: string[]
}): string {
  const subject = input.subject?.trim()
  if (subject) return subject
  const linked = input.linkedEntityLabel?.trim()
  if (linked) return linked
  if (input.operatorEmails.length > 0) {
    return input.operatorEmails.slice(0, 2).join(", ")
  }
  return "Operational context"
}

export async function listCoordinationOperators(
  organizationId: string
): Promise<CoordinationOperatorSummary[]> {
  const rows = await db
    .select({
      userId: neonAuthMember.userId,
      name: neonAuthUser.name,
      email: neonAuthUser.email,
      role: neonAuthMember.role,
    })
    .from(neonAuthMember)
    .innerJoin(neonAuthUser, eq(neonAuthMember.userId, neonAuthUser.id))
    .where(eq(neonAuthMember.organizationId, organizationId))
    .orderBy(asc(neonAuthUser.email))

  return rows
}

export async function listCoordinationContextsForUser(input: {
  organizationId: string
  userId: string
}): Promise<CoordinationContextSummary[]> {
  const contextRows = await db
    .select({
      id: orgCoordinationContext.id,
      subject: orgCoordinationContext.subject,
      linkedEntityType: orgCoordinationContext.linkedEntityType,
      linkedEntityId: orgCoordinationContext.linkedEntityId,
      linkedEntityLabel: orgCoordinationContext.linkedEntityLabel,
      linkedEntityPath: orgCoordinationContext.linkedEntityPath,
      lastActivityAt: orgCoordinationContext.lastActivityAt,
      lastReadAt: orgCoordinationOperator.lastReadAt,
    })
    .from(orgCoordinationOperator)
    .innerJoin(
      orgCoordinationContext,
      eq(orgCoordinationOperator.contextId, orgCoordinationContext.id)
    )
    .where(
      and(
        eq(orgCoordinationOperator.userId, input.userId),
        eq(orgCoordinationContext.organizationId, input.organizationId)
      )
    )
    .orderBy(desc(orgCoordinationContext.lastActivityAt))

  if (contextRows.length === 0) return []

  const contextIds = contextRows.map((row) => row.id)

  const operatorRows = await db
    .select({
      contextId: orgCoordinationOperator.contextId,
      email: neonAuthUser.email,
    })
    .from(orgCoordinationOperator)
    .innerJoin(
      neonAuthUser,
      eq(orgCoordinationOperator.userId, neonAuthUser.id)
    )
    .where(inArray(orgCoordinationOperator.contextId, contextIds))
    .orderBy(asc(neonAuthUser.email))

  const latestActivityRows = await db
    .select({
      contextId: orgCoordinationActivity.contextId,
      body: orgCoordinationActivity.body,
      kind: orgCoordinationActivity.kind,
      createdAt: orgCoordinationActivity.createdAt,
    })
    .from(orgCoordinationActivity)
    .where(inArray(orgCoordinationActivity.contextId, contextIds))
    .orderBy(desc(orgCoordinationActivity.createdAt))

  const unreadRows = await db
    .select({
      contextId: orgCoordinationActivity.contextId,
      unreadCount: sql<number>`count(*)`,
    })
    .from(orgCoordinationActivity)
    .innerJoin(
      orgCoordinationOperator,
      and(
        eq(
          orgCoordinationOperator.contextId,
          orgCoordinationActivity.contextId
        ),
        eq(orgCoordinationOperator.userId, input.userId)
      )
    )
    .where(
      and(
        inArray(orgCoordinationActivity.contextId, contextIds),
        sql`${orgCoordinationActivity.authorUserId} <> ${input.userId}`,
        sql`${orgCoordinationActivity.createdAt} > coalesce(${orgCoordinationOperator.lastReadAt}, to_timestamp(0))`
      )
    )
    .groupBy(orgCoordinationActivity.contextId)

  const operatorEmailsByContext = new Map<string, string[]>()
  for (const row of operatorRows) {
    const current = operatorEmailsByContext.get(row.contextId) ?? []
    current.push(row.email)
    operatorEmailsByContext.set(row.contextId, current)
  }

  const latestActivityByContext = new Map<
    string,
    { body: string; kind: CoordinationActivitySummary["kind"] }
  >()
  for (const row of latestActivityRows) {
    if (!latestActivityByContext.has(row.contextId)) {
      latestActivityByContext.set(row.contextId, {
        body: row.body,
        kind: row.kind as CoordinationActivitySummary["kind"],
      })
    }
  }

  const unreadByContext = new Map(
    unreadRows.map((row) => [row.contextId, Number(row.unreadCount)])
  )

  return contextRows.map((row) => {
    const latest = latestActivityByContext.get(row.id) ?? null
    return {
      id: row.id,
      subject: summarizeContextSubject({
        subject: row.subject,
        linkedEntityLabel: row.linkedEntityLabel,
        operatorEmails: operatorEmailsByContext.get(row.id) ?? [],
      }),
      linkedEntityType: row.linkedEntityType,
      linkedEntityId: row.linkedEntityId,
      linkedEntityLabel: row.linkedEntityLabel,
      linkedEntityPath: row.linkedEntityPath,
      lastActivityAt: row.lastActivityAt.toISOString(),
      latestActivityBody: latest?.body ?? null,
      latestActivityKind: latest?.kind ?? null,
      unreadCount: unreadByContext.get(row.id) ?? 0,
    }
  })
}

export async function getCoordinationContextDetail(input: {
  organizationId: string
  userId: string
  contextId: string
}): Promise<CoordinationContextDetail | null> {
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
        eq(orgCoordinationOperator.userId, input.userId),
        eq(orgCoordinationContext.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!membershipRow) return null

  const [contextRow] = await db
    .select({
      id: orgCoordinationContext.id,
      subject: orgCoordinationContext.subject,
      linkedEntityType: orgCoordinationContext.linkedEntityType,
      linkedEntityId: orgCoordinationContext.linkedEntityId,
      linkedEntityLabel: orgCoordinationContext.linkedEntityLabel,
      linkedEntityPath: orgCoordinationContext.linkedEntityPath,
      lastActivityAt: orgCoordinationContext.lastActivityAt,
      createdAt: orgCoordinationContext.createdAt,
      updatedAt: orgCoordinationContext.updatedAt,
      createdByUserId: orgCoordinationContext.createdByUserId,
    })
    .from(orgCoordinationContext)
    .where(
      and(
        eq(orgCoordinationContext.id, input.contextId),
        eq(orgCoordinationContext.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!contextRow) return null

  const [operatorRows, activityRows] = await Promise.all([
    db
      .select({
        userId: neonAuthMember.userId,
        name: neonAuthUser.name,
        email: neonAuthUser.email,
        role: neonAuthMember.role,
      })
      .from(orgCoordinationOperator)
      .innerJoin(
        neonAuthMember,
        and(
          eq(orgCoordinationOperator.userId, neonAuthMember.userId),
          eq(neonAuthMember.organizationId, input.organizationId)
        )
      )
      .innerJoin(neonAuthUser, eq(neonAuthMember.userId, neonAuthUser.id))
      .where(eq(orgCoordinationOperator.contextId, input.contextId))
      .orderBy(asc(neonAuthUser.email)),
    db
      .select({
        id: orgCoordinationActivity.id,
        contextId: orgCoordinationActivity.contextId,
        kind: orgCoordinationActivity.kind,
        body: orgCoordinationActivity.body,
        evidence: orgCoordinationActivity.evidence,
        createdAt: orgCoordinationActivity.createdAt,
        authorUserId: neonAuthUser.id,
        authorName: neonAuthUser.name,
        authorEmail: neonAuthUser.email,
      })
      .from(orgCoordinationActivity)
      .innerJoin(
        neonAuthUser,
        eq(orgCoordinationActivity.authorUserId, neonAuthUser.id)
      )
      .where(eq(orgCoordinationActivity.contextId, input.contextId))
      .orderBy(asc(orgCoordinationActivity.createdAt)),
  ])

  return {
    context: {
      id: contextRow.id,
      subject: summarizeContextSubject({
        subject: contextRow.subject,
        linkedEntityLabel: contextRow.linkedEntityLabel,
        operatorEmails: operatorRows.map((row) => row.email),
      }),
      linkedEntityType: contextRow.linkedEntityType,
      linkedEntityId: contextRow.linkedEntityId,
      linkedEntityLabel: contextRow.linkedEntityLabel,
      linkedEntityPath: contextRow.linkedEntityPath,
      lastActivityAt: contextRow.lastActivityAt.toISOString(),
      createdAt: contextRow.createdAt.toISOString(),
      updatedAt: contextRow.updatedAt.toISOString(),
      createdByUserId: contextRow.createdByUserId,
    },
    operators: operatorRows,
    activities: activityRows.map((row) => ({
      id: row.id,
      contextId: row.contextId,
      kind: row.kind as CoordinationActivitySummary["kind"],
      body: row.body,
      evidence: normalizeEvidence(row.evidence),
      createdAt: row.createdAt.toISOString(),
      author: {
        userId: row.authorUserId,
        name: row.authorName,
        email: row.authorEmail,
      },
    })),
  }
}
