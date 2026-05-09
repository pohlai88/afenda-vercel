import type { NextRequest } from "next/server"

import {
  canActInOrganization,
  organizationIamAuditExportReadableStream,
  writeIamAuditEventFromHeaders,
} from "#lib/auth"
import { routeTextError } from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"

/**
 * Streaming org IAM audit CSV (larger cap than the Server Action export).
 * Authenticated org admins only; same filter as the audit UI (`org.%` actions).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getOrgSessionFromRequest(request)
  if (!session) {
    return routeTextError("Unauthorized", 401)
  }

  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return routeTextError("Forbidden", 403)
  }

  const includeSimulated =
    request.nextUrl.searchParams.get("includeSimulated") === "1" ||
    request.nextUrl.searchParams.get("includeSimulated") === "true"

  if (includeSimulated) {
    await writeIamAuditEventFromHeaders(request.headers, {
      action: "org.governance.export.include_simulated",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "governance.audit_export",
      resourceId: session.organizationId,
    })
  }

  const stream = organizationIamAuditExportReadableStream(
    session.organizationId,
    {
      auditOriginFilter: includeSimulated ? "all" : "production",
    }
  )
  const day = new Date().toISOString().slice(0, 10)

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="org-iam-audit-${day}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
