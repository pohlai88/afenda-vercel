import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"

const USER_SECURITY_ACTIVITY_ACTIONS = [
  "iam.session.sign_in",
  "iam.session.sign_out",
  "iam.session.sign_up",
  "iam.session.revoke",
  "iam.session.revoke_other",
  "iam.password.change",
  "iam.email.verification.resend",
  "org.member.leave",
  "org.invitation.accept",
  "org.invitation.reject",
] as const

const ACTION_LABEL: Record<string, string> = {
  "iam.session.sign_in": "Signed in",
  "iam.session.sign_out": "Signed out",
  "iam.session.sign_up": "Account created",
  "iam.session.revoke": "Ended another session",
  "iam.session.revoke_other": "Signed out all other sessions",
  "iam.password.change": "Changed password",
  "iam.email.verification.resend": "Sent verification email",
  "org.member.leave": "Left organization",
  "org.invitation.accept": "Accepted organization invitation",
  "org.invitation.reject": "Declined organization invitation",
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
