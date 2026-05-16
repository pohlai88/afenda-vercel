import { ablyMessengerAuthBodySchema } from "#features/messenger"
import {
  assertMessengerRoomMembership,
  createMessengerAblyTokenRequest,
} from "#features/messenger/server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
} from "#lib/route-handler-json.shared"
import { logUnexpectedServerError } from "#lib/logger.server"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const parsedJson = await readRequestJson(request)
  if (!parsedJson.ok) return parsedJson.response

  const parsed = ablyMessengerAuthBodySchema.safeParse(parsedJson.value)
  if (!parsed.success) {
    return routeJsonError("Invalid messenger auth payload", 400)
  }

  if (parsed.data.roomId) {
    const allowed = await assertMessengerRoomMembership({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
      roomId: parsed.data.roomId,
    })
    if (!allowed) {
      return routeJsonError("Forbidden", 403)
    }
  }

  try {
    const tokenRequest = await createMessengerAblyTokenRequest({
      organizationId: orgSession.organizationId,
      clientId: orgSession.userId,
    })
    return routeJsonOk(tokenRequest)
  } catch (err: unknown) {
    logUnexpectedServerError("messenger_ably_token_route_failed", err, {
      organizationId: orgSession.organizationId,
    })
    return routeJsonError("Realtime token unavailable", 503)
  }
}
