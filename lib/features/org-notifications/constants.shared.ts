/** Ably private channel per org member — shell subscribes for realtime notice fan-out. */
export function orgNotificationUserChannelName(
  organizationId: string,
  userId: string
): string {
  return `private-org-notification:${organizationId}:${userId}`
}

export const ORG_NOTIFICATION_REALTIME_EVENT = "org-notification" as const

export const ORG_NOTIFICATION_PUSH_SW_PATH = "/sw-org-notifications.js" as const
