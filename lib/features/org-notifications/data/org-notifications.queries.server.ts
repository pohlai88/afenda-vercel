import "server-only"

import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm"

import { db } from "#lib/db"
import { orgNotificationNotice, orgNotificationReceipt } from "#lib/db/schema"

import { compareOrgNotificationsForDisplay } from "./org-notifications-display.shared"

import type { OrgNotificationNotice } from "../types"

export async function listActiveOrgNotificationsForUser(input: {
  organizationId: string
  userId: string
}): Promise<OrgNotificationNotice[]> {
  const now = new Date()

  const rows = await db
    .select({
      id: orgNotificationNotice.id,
      title: orgNotificationNotice.title,
      body: orgNotificationNotice.body,
      source: orgNotificationNotice.source,
      severity: orgNotificationNotice.severity,
      targetUserId: orgNotificationNotice.targetUserId,
      linkedEntityType: orgNotificationNotice.linkedEntityType,
      linkedEntityId: orgNotificationNotice.linkedEntityId,
      linkedEntityLabel: orgNotificationNotice.linkedEntityLabel,
      linkedPath: orgNotificationNotice.linkedPath,
      publishedAt: orgNotificationNotice.publishedAt,
      expiresAt: orgNotificationNotice.expiresAt,
      readAt: orgNotificationReceipt.readAt,
      acknowledgedAt: orgNotificationReceipt.acknowledgedAt,
    })
    .from(orgNotificationNotice)
    .leftJoin(
      orgNotificationReceipt,
      and(
        eq(orgNotificationReceipt.noticeId, orgNotificationNotice.id),
        eq(orgNotificationReceipt.userId, input.userId)
      )
    )
    .where(
      and(
        eq(orgNotificationNotice.organizationId, input.organizationId),
        or(
          isNull(orgNotificationNotice.targetUserId),
          eq(orgNotificationNotice.targetUserId, input.userId)
        ),
        lte(orgNotificationNotice.publishedAt, now),
        isNull(orgNotificationNotice.closedAt),
        or(
          isNull(orgNotificationNotice.expiresAt),
          gt(orgNotificationNotice.expiresAt, now)
        )
      )
    )
    .orderBy(desc(orgNotificationNotice.publishedAt))

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      source: row.source as OrgNotificationNotice["source"],
      severity: row.severity as OrgNotificationNotice["severity"],
      targetUserId: row.targetUserId,
      linkedEntityType: row.linkedEntityType,
      linkedEntityId: row.linkedEntityId,
      linkedEntityLabel: row.linkedEntityLabel,
      linkedPath: row.linkedPath,
      publishedAt: row.publishedAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      readAt: row.readAt?.toISOString() ?? null,
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      isRead: row.readAt !== null,
      isAcknowledged: row.acknowledgedAt !== null,
    }))
    .sort(compareOrgNotificationsForDisplay)
}

export async function listActiveOrgNotificationsForLinkedEntity(input: {
  organizationId: string
  userId: string
  linkedEntityType: string
  linkedEntityId: string
}): Promise<OrgNotificationNotice[]> {
  const now = new Date()

  const rows = await db
    .select({
      id: orgNotificationNotice.id,
      title: orgNotificationNotice.title,
      body: orgNotificationNotice.body,
      source: orgNotificationNotice.source,
      severity: orgNotificationNotice.severity,
      targetUserId: orgNotificationNotice.targetUserId,
      linkedEntityType: orgNotificationNotice.linkedEntityType,
      linkedEntityId: orgNotificationNotice.linkedEntityId,
      linkedEntityLabel: orgNotificationNotice.linkedEntityLabel,
      linkedPath: orgNotificationNotice.linkedPath,
      publishedAt: orgNotificationNotice.publishedAt,
      expiresAt: orgNotificationNotice.expiresAt,
      readAt: orgNotificationReceipt.readAt,
      acknowledgedAt: orgNotificationReceipt.acknowledgedAt,
    })
    .from(orgNotificationNotice)
    .leftJoin(
      orgNotificationReceipt,
      and(
        eq(orgNotificationReceipt.noticeId, orgNotificationNotice.id),
        eq(orgNotificationReceipt.userId, input.userId)
      )
    )
    .where(
      and(
        eq(orgNotificationNotice.organizationId, input.organizationId),
        eq(orgNotificationNotice.linkedEntityType, input.linkedEntityType),
        eq(orgNotificationNotice.linkedEntityId, input.linkedEntityId),
        or(
          isNull(orgNotificationNotice.targetUserId),
          eq(orgNotificationNotice.targetUserId, input.userId)
        ),
        lte(orgNotificationNotice.publishedAt, now),
        isNull(orgNotificationNotice.closedAt),
        or(
          isNull(orgNotificationNotice.expiresAt),
          gt(orgNotificationNotice.expiresAt, now)
        )
      )
    )
    .orderBy(desc(orgNotificationNotice.publishedAt))

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      source: row.source as OrgNotificationNotice["source"],
      severity: row.severity as OrgNotificationNotice["severity"],
      targetUserId: row.targetUserId,
      linkedEntityType: row.linkedEntityType,
      linkedEntityId: row.linkedEntityId,
      linkedEntityLabel: row.linkedEntityLabel,
      linkedPath: row.linkedPath,
      publishedAt: row.publishedAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      readAt: row.readAt?.toISOString() ?? null,
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      isRead: row.readAt !== null,
      isAcknowledged: row.acknowledgedAt !== null,
    }))
    .sort(compareOrgNotificationsForDisplay)
}

export async function findActiveOrgNotification(input: {
  organizationId: string
  title: string
  targetUserId?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
}): Promise<{ id: string } | null> {
  const now = new Date()
  const [row] = await db
    .select({ id: orgNotificationNotice.id })
    .from(orgNotificationNotice)
    .where(
      and(
        eq(orgNotificationNotice.organizationId, input.organizationId),
        eq(orgNotificationNotice.title, input.title),
        input.targetUserId == null
          ? isNull(orgNotificationNotice.targetUserId)
          : eq(orgNotificationNotice.targetUserId, input.targetUserId),
        input.linkedEntityType == null
          ? isNull(orgNotificationNotice.linkedEntityType)
          : eq(orgNotificationNotice.linkedEntityType, input.linkedEntityType),
        input.linkedEntityId == null
          ? isNull(orgNotificationNotice.linkedEntityId)
          : eq(orgNotificationNotice.linkedEntityId, input.linkedEntityId),
        lte(orgNotificationNotice.publishedAt, now),
        isNull(orgNotificationNotice.closedAt),
        or(
          isNull(orgNotificationNotice.expiresAt),
          gt(orgNotificationNotice.expiresAt, now)
        )
      )
    )
    .limit(1)

  return row ?? null
}
