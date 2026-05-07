import type { NextRequest } from "next/server"

import {
  canActInOrganization,
  organizationIamAuditExportReadableStream,
} from "#lib/auth"
import { getOrgSessionFromRequest } from "#lib/tenant"

/**
 * Streaming org IAM audit CSV (larger cap than the Server Action export).
 * Authenticated org admins only; same filter as the audit UI (`org.%` actions).
 * Dynamic by default (Next.js Route Handler) — do not force-static; uses request/session + streaming.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getOrgSessionFromRequest(request)
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return new Response("Forbidden", { status: 403 })
  }

  const stream = organizationIamAuditExportReadableStream(
    session.organizationId
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
