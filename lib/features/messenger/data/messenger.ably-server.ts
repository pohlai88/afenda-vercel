import "server-only"

import Ably from "ably"

import { logUnexpectedServerError } from "#lib/logger.server"

import { messengerOrgPrivateChannelName } from "../constants"

let restSingleton: Ably.Rest | null = null

function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY
  if (!key?.trim()) return null
  if (!restSingleton) {
    restSingleton = new Ably.Rest({ key })
  }
  return restSingleton
}

export type MessengerRealtimePayload =
  | {
      kind: "message.created"
      roomId: string
      message: {
        id: string
        authorUserId: string
        body: string
        createdAt: string
      }
    }
  | { kind: "room.created"; roomId: string }

/**
 * Publishes a lightweight envelope on the org-scoped private channel.
 * Subscribers merge into local UI; Postgres remains the source of truth.
 */
export async function publishMessengerOrgEvent(
  organizationId: string,
  payload: MessengerRealtimePayload
): Promise<void> {
  const rest = getAblyRest()
  if (!rest) return
  try {
    const channel = rest.channels.get(
      messengerOrgPrivateChannelName(organizationId)
    )
    await channel.publish("messenger", payload)
  } catch (err: unknown) {
    logUnexpectedServerError("messenger_ably_publish_failed", err, {
      organizationId,
      kind: payload.kind,
      roomId: "roomId" in payload ? payload.roomId : undefined,
    })
  }
}

export function createMessengerAblyTokenRequest(input: {
  organizationId: string
  clientId: string
}): Promise<Ably.TokenRequest> {
  const rest = getAblyRest()
  if (!rest) {
    return Promise.reject(new Error("ABLY_API_KEY is not configured"))
  }
  const channelName = messengerOrgPrivateChannelName(input.organizationId)
  return rest.auth.createTokenRequest({
    clientId: input.clientId,
    capability: {
      [channelName]: ["subscribe", "publish", "presence", "history"],
    },
  })
}
