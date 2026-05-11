import { writeIamAuditEventFromHeaders } from "#lib/auth"
import {
  createCoordinationContext,
  listCoordinationContextsForUser,
} from "#features/coordination/server"
import { createCoordinationContextSchema } from "#features/coordination"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
} from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const items = await listCoordinationContextsForUser({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
  })

  return routeJsonOk({ items })
}

export async function POST(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const parsedJson = await readRequestJson(request)
  if (!parsedJson.ok) return parsedJson.response

  const parsed = createCoordinationContextSchema.safeParse(parsedJson.value)
  if (!parsed.success) {
    return routeJsonError("Invalid coordination context", 400)
  }

  try {
    const result = await createCoordinationContext({
      organizationId: orgSession.organizationId,
      actorUserId: orgSession.userId,
      data: parsed.data,
    })

    await writeIamAuditEventFromHeaders(request.headers, {
      action: "erp.coordination.context.create",
      actorUserId: orgSession.userId,
      actorSessionId: orgSession.sessionId,
      organizationId: orgSession.organizationId,
      resourceType: "org_coordination_context",
      resourceId: result.contextId,
      metadata: {
        operatorCount: new Set([
          orgSession.userId,
          ...parsed.data.operatorUserIds,
        ]).size,
        linkedEntityType: parsed.data.linkedEntityType ?? null,
        linkedEntityId: parsed.data.linkedEntityId ?? null,
      },
    })

    return routeJsonOk(result, { status: 201 })
  } catch (error) {
    return routeJsonError(
      routePublicErrorMessage(error, "Context creation failed"),
      400
    )
  }
}
