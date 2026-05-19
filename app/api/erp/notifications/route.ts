import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"
import {
  createOrgNotificationSchema,
  type CreateOrgNotificationInput,
} from "#features/org-notifications"
import {
  createOrgNotification,
  listActiveOrgNotificationsForUser,
} from "#features/org-notifications/server"
import {
  readRequestJson,
  routeJsonError,
  routeJsonOk,
  routePublicErrorMessage,
} from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"

export async function GET(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const items = await listActiveOrgNotificationsForUser({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
  })

  return routeJsonOk({ items })
}

export async function POST(request: Request) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const canManage = await canUseErpPermission({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
    permission: {
      module: "planner",
      object: "notice",
      function: "update",
    },
  })
  if (!canManage) return routeJsonError("Forbidden", 403)

  const parsedJson = await readRequestJson(request)
  if (!parsedJson.ok) return parsedJson.response

  const parsed = createOrgNotificationSchema.safeParse(parsedJson.value)
  if (!parsed.success) {
    return routeJsonError("Invalid notification payload", 400)
  }

  try {
    const result = await createOrgNotification({
      organizationId: orgSession.organizationId,
      actorUserId: orgSession.userId,
      data: parsed.data satisfies CreateOrgNotificationInput,
    })

    await writeIamAuditEventFromHeaders(request.headers, {
      action: "org.notification.create",
      actorUserId: orgSession.userId,
      actorSessionId: orgSession.sessionId,
      organizationId: orgSession.organizationId,
      resourceType: "org_notification_notice",
      resourceId: result.noticeId,
      metadata: {
        source: "admin",
        severity: parsed.data.severity,
        targetUserId: parsed.data.targetUserId ?? null,
        linkedEntityType: parsed.data.linkedEntityType ?? null,
        linkedEntityId: parsed.data.linkedEntityId ?? null,
        expiresAt: parsed.data.expiresAt ?? null,
      },
    })

    return routeJsonOk(
      {
        noticeId: result.noticeId,
        publishedAt: result.publishedAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    return routeJsonError(
      routePublicErrorMessage(error, "Notification creation failed"),
      400
    )
  }
}
