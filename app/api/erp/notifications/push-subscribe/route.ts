import { orgPushSubscriptionBodySchema } from "#features/org-notifications"
import { upsertOrgPushSubscription } from "#features/org-notifications/server"
import { isOrgPushConfigured } from "#features/org-notifications/server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
} from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"

export async function POST(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  if (!isOrgPushConfigured()) {
    return routeJsonError("Web Push is not configured", 503)
  }

  const parsedJson = await readRequestJson(request)
  if (!parsedJson.ok) return parsedJson.response

  const parsed = orgPushSubscriptionBodySchema.safeParse(parsedJson.value)
  if (!parsed.success) {
    return routeJsonError("Invalid push subscription payload", 400)
  }

  const userAgent = request.headers.get("user-agent")

  await upsertOrgPushSubscription({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    userAgent,
  })

  return routeJsonOk({ ok: true })
}
