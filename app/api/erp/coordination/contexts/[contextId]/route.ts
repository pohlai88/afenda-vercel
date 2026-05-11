import { getCoordinationContextDetail } from "#features/coordination/server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/erp/coordination/contexts/[contextId]">
) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const { contextId } = await params
  const detail = await getCoordinationContextDetail({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
    contextId,
  })

  if (!detail) return routeJsonError("Context not found", 404)
  return routeJsonOk(detail)
}
