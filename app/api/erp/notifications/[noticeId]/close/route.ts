import { canActInOrganization, writeIamAuditEventFromHeaders } from "#lib/auth"
import { closeOrgNotification } from "#features/org-notifications/server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/erp/notifications/[noticeId]/close">
) {
  const orgSession = await getOrgSessionFromRequest(request)
  if (!orgSession) return routeJsonError("Unauthorized", 401)

  const canManage = await canActInOrganization(
    orgSession.userId,
    orgSession.user.role,
    orgSession.organizationId,
    "admin"
  )
  if (!canManage) return routeJsonError("Forbidden", 403)

  const { noticeId } = await params

  try {
    await closeOrgNotification({
      organizationId: orgSession.organizationId,
      actorUserId: orgSession.userId,
      noticeId,
    })

    await writeIamAuditEventFromHeaders(request.headers, {
      action: "org.notification.close",
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
