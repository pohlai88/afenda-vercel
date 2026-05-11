import "server-only"

import { and, eq, isNull, lte, or, gt } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { orgNotificationNotice, orgNotificationReceipt } from "#lib/db/schema"

import type {
  CreateOrgNotificationInput,
  PublishOrgNotificationInput,
} from "../types"

function normalizeTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

function parseOptionalExpiry(value: string | null | undefined): Date | null {
  const raw = value?.trim() ?? ""
  if (raw.length === 0) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid notification expiry")
  }
  return parsed
}

async function assertActiveNoticeForOrg(input: {
  organizationId: string
  noticeId: string
}): Promise<void> {
  const now = new Date()
  const [row] = await db
    .select({ id: orgNotificationNotice.id })
    .from(orgNotificationNotice)
    .where(
      and(
        eq(orgNotificationNotice.id, input.noticeId),
        eq(orgNotificationNotice.organizationId, input.organizationId),
        lte(orgNotificationNotice.publishedAt, now),
        isNull(orgNotificationNotice.closedAt),
        or(
          isNull(orgNotificationNotice.expiresAt),
          gt(orgNotificationNotice.expiresAt, now)
        )
      )
    )
    .limit(1)

  if (!row) {
    throw new Error("Notification not found")
  }
}

export async function createOrgNotification(input: {
  organizationId: string
  actorUserId: string
  data: CreateOrgNotificationInput
}): Promise<{ noticeId: string; publishedAt: Date }> {
  const now = new Date()
  const [row] = await db
    .insert(orgNotificationNotice)
    .values({
      organizationId: input.organizationId,
      source: "admin",
      createdByUserId: input.actorUserId,
      title: input.data.title.trim(),
      body: input.data.body.trim(),
      severity: input.data.severity,
      linkedEntityType: normalizeTrimmed(input.data.linkedEntityType),
      linkedEntityId: normalizeTrimmed(input.data.linkedEntityId),
      linkedEntityLabel: normalizeTrimmed(input.data.linkedEntityLabel),
      linkedPath: normalizeTrimmed(input.data.linkedPath),
      publishedAt: now,
      expiresAt: parseOptionalExpiry(input.data.expiresAt),
    })
    .returning({
      id: orgNotificationNotice.id,
      publishedAt: orgNotificationNotice.publishedAt,
    })

  return { noticeId: row.id, publishedAt: row.publishedAt }
}

export async function publishOrgNotification(
  input: PublishOrgNotificationInput
): Promise<{ noticeId: string; publishedAt: Date }> {
  const now = new Date()
  const publishedAt = now
  const [row] = await db
    .insert(orgNotificationNotice)
    .values({
      organizationId: input.organizationId,
      source: "system",
      createdByUserId: null,
      title: input.title.trim(),
      body: input.body.trim(),
      severity: input.severity ?? "info",
      linkedEntityType: normalizeTrimmed(input.linkedEntityType),
      linkedEntityId: normalizeTrimmed(input.linkedEntityId),
      linkedEntityLabel: normalizeTrimmed(input.linkedEntityLabel),
      linkedPath: normalizeTrimmed(input.linkedPath),
      publishedAt,
      expiresAt: input.expiresAt ?? null,
    })
    .returning({
      id: orgNotificationNotice.id,
      publishedAt: orgNotificationNotice.publishedAt,
    })

  await writeIamAuditEvent({
    action: "org.notification.create",
    actorUserId: null,
    actorSessionId: null,
    organizationId: input.organizationId,
    resourceType: "org_notification_notice",
    resourceId: row.id,
    metadata: {
      source: "system",
      severity: input.severity ?? "info",
      linkedEntityType: normalizeTrimmed(input.linkedEntityType),
      linkedEntityId: normalizeTrimmed(input.linkedEntityId),
    },
  })

  return { noticeId: row.id, publishedAt: row.publishedAt }
}

export async function markOrgNotificationRead(input: {
  organizationId: string
  actorUserId: string
  noticeId: string
}): Promise<void> {
  await assertActiveNoticeForOrg({
    organizationId: input.organizationId,
    noticeId: input.noticeId,
  })

  const now = new Date()
  await db
    .insert(orgNotificationReceipt)
    .values({
      noticeId: input.noticeId,
      userId: input.actorUserId,
      readAt: now,
      acknowledgedAt: null,
    })
    .onConflictDoUpdate({
      target: [orgNotificationReceipt.noticeId, orgNotificationReceipt.userId],
      set: {
        readAt: now,
        updatedAt: now,
      },
    })
}

export async function acknowledgeOrgNotification(input: {
  organizationId: string
  actorUserId: string
  noticeId: string
}): Promise<void> {
  await assertActiveNoticeForOrg({
    organizationId: input.organizationId,
    noticeId: input.noticeId,
  })

  const now = new Date()
  await db
    .insert(orgNotificationReceipt)
    .values({
      noticeId: input.noticeId,
      userId: input.actorUserId,
      readAt: now,
      acknowledgedAt: now,
    })
    .onConflictDoUpdate({
      target: [orgNotificationReceipt.noticeId, orgNotificationReceipt.userId],
      set: {
        readAt: now,
        acknowledgedAt: now,
        updatedAt: now,
      },
    })
}

export async function closeOrgNotification(input: {
  organizationId: string
  actorUserId: string
  noticeId: string
}): Promise<void> {
  const now = new Date()
  const rows = await db
    .update(orgNotificationNotice)
    .set({
      closedAt: now,
      closedByUserId: input.actorUserId,
      updatedAt: now,
    })
    .where(
      and(
        eq(orgNotificationNotice.id, input.noticeId),
        eq(orgNotificationNotice.organizationId, input.organizationId),
        isNull(orgNotificationNotice.closedAt)
      )
    )
    .returning({ id: orgNotificationNotice.id })

  if (rows.length === 0) {
    throw new Error("Notification not found")
  }
}
