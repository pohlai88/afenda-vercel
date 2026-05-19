import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { logUnexpectedServerError } from "#lib/logger.server"
import { routeJsonError } from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"
import {
  buildOrganizationStructureExportCsv,
  HRM_ORG_STRUCTURE_AUDIT,
} from "#features/hrm/server"

function optionalSearchParam(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key)?.trim()
  return value ? value : undefined
}

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

    const url = new URL(request.url)
    const asOf = url.searchParams.get("asOfDate")
    const asOfDate =
      asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)
        ? new Date(`${asOf}T00:00:00.000Z`)
        : undefined
    const includeFuture = url.searchParams.get("includeFuture") === "1"
    const includeArchived = url.searchParams.get("includeArchived") === "1"

    const csv = await buildOrganizationStructureExportCsv(org.organizationId, {
      asOfDate,
      includeFuture,
      includeArchived,
      orgUnitType: optionalSearchParam(url, "orgUnitType"),
      orgUnitStatus: optionalSearchParam(url, "orgUnitStatus"),
      positionStatus: optionalSearchParam(url, "positionStatus"),
      legalEntityId: optionalSearchParam(url, "legalEntityId"),
      businessUnitId: optionalSearchParam(url, "businessUnitId"),
      departmentId: optionalSearchParam(url, "departmentId"),
      teamId: optionalSearchParam(url, "teamId"),
      managerEmployeeId: optionalSearchParam(url, "managerEmployeeId"),
      positionId: optionalSearchParam(url, "positionId"),
      workLocationCode: optionalSearchParam(url, "workLocationCode"),
      costCenterCode: optionalSearchParam(url, "costCenterCode"),
    })

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
