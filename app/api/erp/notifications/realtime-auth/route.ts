import {
  createOrgNotificationAblyTokenRequest,
  orgNotificationUserChannelName,
} from "#features/org-notifications/server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
} from "#lib/api/route-handler-json.shared"
import { logUnexpectedServerError } from "#lib/logger.server"
import { getOrgSessionFromRequest } from "#lib/auth"

export async function POST(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const parsedJson = await readRequestJson(request)
  if (!parsedJson.ok) return parsedJson.response

  try {
    const [tokenRequest, channelName] = await Promise.all([
      createOrgNotificationAblyTokenRequest({
        organizationId: orgSession.organizationId,
        userId: orgSession.userId,
      }),
      Promise.resolve(
        orgNotificationUserChannelName(
          orgSession.organizationId,
          orgSession.userId
        )
      ),
    ])
    return routeJsonOk({ ...tokenRequest, channelName })
  } catch (err: unknown) {
    logUnexpectedServerError("org_notification_ably_token_route_failed", err, {
      organizationId: orgSession.organizationId,
    })
    return routeJsonError("Realtime token unavailable", 503)
  }
}
