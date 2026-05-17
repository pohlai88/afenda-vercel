import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { logUnexpectedServerError } from "#lib/logger.server"
import { routeJsonError } from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"
import { canUseErpPermission } from "#features/erp-rbac/server"
import {
  buildOrganizationStructureExportCsv,
  HRM_ORG_STRUCTURE_AUDIT,
} from "#features/hrm/server"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const org = await getOrgSessionFromRequest(request)
    if (!org) {
      return routeJsonError("Unauthorized", 401)
    }

    const allowed = await canUseErpPermission({
      organizationId: org.organizationId,
      userId: org.userId,
      permission: {
        module: "hrm",
        object: "organization",
        function: "search",
      },
    })
    if (!allowed) {
      return routeJsonError("Forbidden", 403)
    }

    const csv = await buildOrganizationStructureExportCsv(org.organizationId)

    await writeIamAuditEventFromHeaders(request.headers, {
      action: HRM_ORG_STRUCTURE_AUDIT.export.search,
      actorUserId: org.userId,
      actorSessionId: org.sessionId,
      organizationId: org.organizationId,
      resourceType: "hrm_organization_structure",
      resourceId: org.organizationId,
      metadata: { rowCount: Math.max(0, csv.split("\n").length - 1) },
    })

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="organization-structure.csv"',
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    logUnexpectedServerError("organization-structure-export", err)
    return routeJsonError("Export failed", 500)
  }
}
