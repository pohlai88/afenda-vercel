import "server-only"

import { and, eq } from "drizzle-orm"
import webpush from "web-push"

import { logUnexpectedServerError } from "#lib/logger.server"
import { db } from "#lib/db"
import { orgPushSubscription } from "#lib/db/schema"

import { isOrgPushConfigured } from "./org-push-vapid.shared"

function configureWebPush(): boolean {
  if (!isOrgPushConfigured()) return false
  const publicKey = process.env.NEXT_PUBLIC_ORG_PUSH_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.ORG_PUSH_VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.ORG_PUSH_VAPID_SUBJECT?.trim()
  if (!publicKey || !privateKey || !subject) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export async function dispatchOrgPushNotification(input: {
  organizationId: string
  targetUserId: string
  noticeId: string
  title: string
  body: string
  severity: "info" | "warning" | "critical"
  linkedPath: string | null
}): Promise<void> {
  if (!configureWebPush()) return

  const rows = await db
    .select({
      id: orgPushSubscription.id,
      endpoint: orgPushSubscription.endpoint,
      p256dh: orgPushSubscription.p256dh,
      auth: orgPushSubscription.auth,
    })
    .from(orgPushSubscription)
    .where(
      and(
        eq(orgPushSubscription.organizationId, input.organizationId),
        eq(orgPushSubscription.userId, input.targetUserId)
      )
    )

  if (rows.length === 0) return

  const payload = JSON.stringify({
    noticeId: input.noticeId,
    title: input.title,
    body: input.body,
    severity: input.severity,
    url: input.linkedPath,
  })

  await Promise.allSettled(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload
        )
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode: number }).statusCode)
            : null
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(orgPushSubscription)
            .where(eq(orgPushSubscription.id, row.id))
          return
        }
        logUnexpectedServerError("org_push_send_failed", err, {
          organizationId: input.organizationId,
          subscriptionId: row.id,
        })
      }
    })
  )
}
