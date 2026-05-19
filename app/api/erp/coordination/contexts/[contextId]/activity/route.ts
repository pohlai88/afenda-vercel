import {
  addCoordinationActivity,
  getCoordinationContextDetail,
} from "#features/coordination/server"
import { createCoordinationActivitySchema } from "#features/coordination"
import { writeIamAuditEventFromHeaders } from "#lib/auth"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
} from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"

export async function POST(
  request: Request,
  {
    params,
  }: RouteContext<"/api/erp/coordination/contexts/[contextId]/activity">
) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const parsedJson = await readRequestJson(request)
  if (!parsedJson.ok) return parsedJson.response

  const parsed = createCoordinationActivitySchema.safeParse(parsedJson.value)
  if (!parsed.success) {
    return routeJsonError("Invalid activity payload", 400)
  }

  const { contextId } = await params

  try {
    const result = await addCoordinationActivity({
      organizationId: orgSession.organizationId,
      actorUserId: orgSession.userId,
      contextId,
      data: parsed.data,
    })

    const detail = await getCoordinationContextDetail({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
      contextId,
    })

    await writeIamAuditEventFromHeaders(request.headers, {
      action: "erp.coordination.activity.create",
      actorUserId: orgSession.userId,
      actorSessionId: orgSession.sessionId,
      organizationId: orgSession.organizationId,
      resourceType: "org_coordination_activity",
      resourceId: result.activityId,
      metadata: {
        contextId,
        kind: parsed.data.kind,
        evidenceCount: parsed.data.evidence?.length ?? 0,
        linkedEntityType: detail?.context.linkedEntityType ?? null,
        linkedEntityId: detail?.context.linkedEntityId ?? null,
      },
    })

    return routeJsonOk({
      activityId: result.activityId,
      createdAt: result.createdAt.toISOString(),
    })
  } catch (error) {
    return routeJsonError(
      routePublicErrorMessage(error, "Activity submission failed"),
      400
    )
  }
}
