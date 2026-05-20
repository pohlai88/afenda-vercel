import "server-only"

import { publishOrgNotificationRealtime } from "./org-notifications.ably-server"
import { dispatchOrgPushNotification } from "./org-push-dispatch.server"

import type { OrgNotificationSeverity } from "../types"

/** Best-effort realtime + Web Push after an in-app notice is persisted. */
export async function deliverOrgNotificationChannels(input: {
  organizationId: string
  targetUserId: string | null
  noticeId: string
  title: string
  body: string
  severity: OrgNotificationSeverity
  linkedPath: string | null
}): Promise<void> {
  if (!input.targetUserId) return

  try {
    await publishOrgNotificationRealtime({
      organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      noticeId: input.noticeId,
      title: input.title,
      severity: input.severity,
      linkedPath: input.linkedPath,
    })
  } catch {
    // Must not roll back notice persistence.
  }

  try {
    await dispatchOrgPushNotification({
      organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      noticeId: input.noticeId,
      title: input.title,
      body: input.body,
      severity: input.severity,
      linkedPath: input.linkedPath,
    })
  } catch {
    // Push delivery is best-effort.
  }
}
