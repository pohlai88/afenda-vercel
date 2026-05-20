import { orgPushUnsubscribeBodySchema } from "#features/org-notifications/schemas/org-notifications.schema"
import { deleteOrgPushSubscriptionForUser } from "#features/org-notifications/server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
} from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"

export async function POST(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const parsedJson = await readRequestJson(request)
  if (!parsedJson.ok) return parsedJson.response

  const parsed = orgPushUnsubscribeBodySchema.safeParse(parsedJson.value ?? {})
  if (!parsed.success) {
    return routeJsonError("Invalid push unsubscribe payload", 400)
  }

  await deleteOrgPushSubscriptionForUser({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
    endpoint: parsed.data.endpoint ?? null,
  })

  return routeJsonOk({ ok: true })
}
