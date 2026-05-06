import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"

const USER_SECURITY_ACTIVITY_ACTIONS = [
  "iam.session.sign_in",
  "iam.session.sign_out",
  "iam.session.sign_up",
] as const

const ACTION_LABEL: Record<string, string> = {
  "iam.session.sign_in": "Signed in",
  "iam.session.sign_out": "Signed out",
  "iam.session.sign_up": "Account created",
}

export type UserSecurityActivityRow = {
  id: string
  action: string
  label: string
  createdAt: Date
  path: string | null
}

export async function listUserSecurityActivity(
  userId: string,
  limit = 12
): Promise<UserSecurityActivityRow[]> {
  const rows = await db
    .select({
      id: iamAuditEvent.id,
      action: iamAuditEvent.action,
      createdAt: iamAuditEvent.createdAt,
      path: iamAuditEvent.path,
    })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.actorUserId, userId),
        inArray(iamAuditEvent.action, [...USER_SECURITY_ACTIVITY_ACTIONS])
      )
    )
    .orderBy(desc(iamAuditEvent.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    ...r,
    label: ACTION_LABEL[r.action] ?? r.action,
  }))
}
