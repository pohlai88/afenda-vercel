import "server-only"

import Ably from "ably"

import { logUnexpectedServerError } from "#lib/logger.server"

import {
  ORG_NOTIFICATION_REALTIME_EVENT,
  orgNotificationUserChannelName,
} from "../constants.shared"

let restSingleton: Ably.Rest | null = null

function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY
  if (!key?.trim()) return null
  if (!restSingleton) {
    restSingleton = new Ably.Rest({ key })
  }
  return restSingleton
}

export type OrgNotificationRealtimePayload = {
  kind: "notice.created"
  noticeId: string
  title: string
  severity: "info" | "warning" | "critical"
  linkedPath: string | null
}

export async function publishOrgNotificationRealtime(
  input: {
    organizationId: string
    targetUserId: string
    noticeId: string
    title: string
    severity: "info" | "warning" | "critical"
    linkedPath: string | null
  }
): Promise<void> {
  const rest = getAblyRest()
  if (!rest) return

  const payload: OrgNotificationRealtimePayload = {
    kind: "notice.created",
    noticeId: input.noticeId,
    title: input.title,
    severity: input.severity,
    linkedPath: input.linkedPath,
  }

  try {
    const channel = rest.channels.get(
      orgNotificationUserChannelName(
        input.organizationId,
        input.targetUserId
      )
    )
    await channel.publish(ORG_NOTIFICATION_REALTIME_EVENT, payload)
  } catch (err: unknown) {
    logUnexpectedServerError("org_notification_ably_publish_failed", err, {
      organizationId: input.organizationId,
      noticeId: input.noticeId,
    })
  }
}

export function createOrgNotificationAblyTokenRequest(input: {
  organizationId: string
  userId: string
}): Promise<Ably.TokenRequest> {
  const rest = getAblyRest()
  if (!rest) {
    return Promise.reject(new Error("ABLY_API_KEY is not configured"))
  }
  const channelName = orgNotificationUserChannelName(
    input.organizationId,
    input.userId
  )
  return rest.auth.createTokenRequest({
    clientId: input.userId,
    capability: {
      [channelName]: ["subscribe"],
    },
  })
}
