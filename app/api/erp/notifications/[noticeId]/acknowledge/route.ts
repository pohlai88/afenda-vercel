import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { acknowledgeOrgNotification } from "#features/org-notifications/server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"


export async function POST(
  request: Request,
  { params }: RouteContext<"/api/erp/notifications/[noticeId]/acknowledge">
) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const { noticeId } = await params

  try {
    await acknowledgeOrgNotification({
      organizationId: orgSession.organizationId,
      actorUserId: orgSession.userId,
      noticeId,
    })

    await writeIamAuditEventFromHeaders(request.headers, {
      action: "org.notification.acknowledge",
      actorUserId: orgSession.userId,
      actorSessionId: orgSession.sessionId,
      organizationId: orgSession.organizationId,
      resourceType: "org_notification_notice",
      resourceId: noticeId,
    })

    return routeJsonOk({ ok: true })
  } catch {
    return routeJsonError("Notification not found", 404)
  }
}
