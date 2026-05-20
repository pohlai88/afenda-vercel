"use client"

import { useEffect, useRef } from "react"
import Ably from "ably"

import { useRouteEnvelope } from "#components2/route-envelope-context.client"
import {
  ORG_NOTIFICATION_PUSH_SW_PATH,
  ORG_NOTIFICATION_REALTIME_EVENT,
  readOrgPushVapidPublicKey,
} from "#features/org-notifications/client"

export const AFENDA_ORG_NOTIFICATION_REFRESH_EVENT =
  "afenda:org-notification-refresh" as const

type OrgNotificationRealtimeAuthResponse = Ably.TokenRequest & {
  channelName?: string
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64Safe)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

function dispatchOrgNotificationRefresh(): void {
  window.dispatchEvent(new CustomEvent(AFENDA_ORG_NOTIFICATION_REFRESH_EVENT))
}

async function registerWebPushSubscription(): Promise<void> {
  const vapidPublicKey = readOrgPushVapidPublicKey()
  if (!vapidPublicKey) return
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
  if (Notification.permission !== "granted") return

  const registration = await navigator.serviceWorker.register(
    ORG_NOTIFICATION_PUSH_SW_PATH,
    { scope: "/" }
  )
  await navigator.serviceWorker.ready

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        vapidPublicKey
      ) as BufferSource,
    }))

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

  await fetch("/api/erp/notifications/push-subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  })
}

export function AppShellOrgNotificationDelivery() {
  const envelope = useRouteEnvelope()
  const organizationId = envelope?.surface === "org" ? envelope.orgId : null
  const channelNameRef = useRef<string | null>(null)
  const ablyRef = useRef<Ably.Realtime | null>(null)
  const pushStartedRef = useRef(false)

  useEffect(() => {
    if (!organizationId) return

    const rt = new Ably.Realtime({
      authCallback: (_tokenParams, callback) => {
        void fetch("/api/erp/notifications/realtime-auth", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
          .then(async (r) => {
            if (!r.ok) throw new Error("auth failed")
            return (await r.json()) as OrgNotificationRealtimeAuthResponse
          })
          .then((data) => {
            if (data.channelName) {
              channelNameRef.current = data.channelName
            }
            const { channelName: _channel, ...tokenRequest } = data
            void _channel
            callback(null, tokenRequest)
          })
          .catch((err: unknown) => {
            callback(
              err instanceof Error ? err.message : "Ably auth failed",
              null
            )
          })
      },
    })

    const onNotice = () => {
      dispatchOrgNotificationRefresh()
    }

    rt.connection.on("connected", () => {
      const channelName = channelNameRef.current
      if (!channelName) return
      const channel = rt.channels.get(channelName)
      channel.subscribe(ORG_NOTIFICATION_REALTIME_EVENT, onNotice)
    })

    ablyRef.current = rt

    return () => {
      rt.close()
      ablyRef.current = null
      channelNameRef.current = null
    }
  }, [organizationId])

  useEffect(() => {
    if (!organizationId || pushStartedRef.current) return
    if (!readOrgPushVapidPublicKey()) return
    if (!("Notification" in window)) return

    const handle = window.setTimeout(() => {
      void (async () => {
        if (Notification.permission === "default") {
          const result = await Notification.requestPermission()
          if (result !== "granted") return
        }
        if (Notification.permission !== "granted") return
        pushStartedRef.current = true
        await registerWebPushSubscription().catch(() => {})
      })()
    }, 0)

    return () => window.clearTimeout(handle)
  }, [organizationId])

  return null
}
