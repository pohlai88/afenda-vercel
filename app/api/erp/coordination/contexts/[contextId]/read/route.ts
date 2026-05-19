import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { markCoordinationContextRead } from "#features/coordination/server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/erp/coordination/contexts/[contextId]/read">
) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const { contextId } = await params

  try {
    await markCoordinationContextRead({
      organizationId: orgSession.organizationId,
      actorUserId: orgSession.userId,
      contextId,
    })

    await writeIamAuditEventFromHeaders(request.headers, {
      action: "erp.coordination.context.read",
      actorUserId: orgSession.userId,
      actorSessionId: orgSession.sessionId,
      organizationId: orgSession.organizationId,
      resourceType: "org_coordination_context",
      resourceId: contextId,
    })

    return routeJsonOk({ ok: true })
  } catch {
    return routeJsonError("Context not found", 404)
  }
}
