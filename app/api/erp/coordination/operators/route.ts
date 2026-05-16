import { listCoordinationOperators } from "#features/coordination/server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const items = await listCoordinationOperators(orgSession.organizationId)
  return routeJsonOk({ items })
}
