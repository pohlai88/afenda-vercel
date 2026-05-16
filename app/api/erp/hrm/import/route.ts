import { createHash } from "node:crypto"

import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmImportSession } from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"
import {
  ROUTE_JSON_HEADERS,
  routeJsonError,
} from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  dryRunAttendance,
  dryRunEmployees,
  dryRunPayroll,
  parseCsv,
} from "#features/hrm/server"
import { HRM_IMPORT_TYPES, hrmImportTypeSchema } from "#features/hrm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Cap inline CSV stored for employee commit/rollback (chars). */
const HRM_IMPORT_MAX_SOURCE_CHARS = 900_000

type RowErr = { line: number; message: string }

export async function POST(request: Request) {
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
        object: "import",
        function: "create",
      },
    })
    if (!allowed) {
      return routeJsonError("Forbidden", 403)
    }

    const ct = request.headers.get("content-type") ?? ""
    if (!ct.includes("multipart/form-data")) {
      return routeJsonError("Expected multipart/form-data", 415)
    }

    const form = await request.formData()
    const orgSlug = String(form.get("orgSlug") ?? "").trim()
    const importTypeRaw = String(form.get("importType") ?? "").trim()
    const file = form.get("file")

    if (!orgSlug) {
      return routeJsonError("orgSlug required", 400)
    }

    const importParsed = hrmImportTypeSchema.safeParse(importTypeRaw)
    if (!importParsed.success) {
      return routeJsonError(
        `importType must be one of: ${HRM_IMPORT_TYPES.join(", ")}`,
        400
      )
    }
    const importType = importParsed.data

    if (!(file instanceof File)) {
      return routeJsonError("file required", 400)
    }

    const text = await file.text()
    const rows = parseCsv(text)
    let summary: { rowCount: number; errors: RowErr[] }
    if (importType === "employees") {
      summary = dryRunEmployees(rows)
    } else if (importType === "attendance") {
      summary = dryRunAttendance(rows)
    } else {
      summary = dryRunPayroll(rows)
    }

    const errorJson =
      summary.errors.length > 0 ? { rows: summary.errors } : null
    const contentSha256 = createHash("sha256").update(text).digest("hex")

    const rollbackJson =
      importType === "employees" &&
      summary.errors.length === 0 &&
      summary.rowCount > 0 &&
      text.length <= HRM_IMPORT_MAX_SOURCE_CHARS
        ? {
            kind: "hrm_import_v1" as const,
            importType: "employees" as const,
            contentSha256,
            sourceCsv: text,
          }
        : {
            kind: "hrm_import_placeholder" as const,
            importType,
            contentSha256,
          }

    const id = crypto.randomUUID()
    await db.insert(hrmImportSession).values({
      id,
      organizationId: org.organizationId,
      importType,
      status: "dry_run",
      rowCount: summary.rowCount,
      errorJson,
      rollbackJson,
      createdByUserId: org.userId,
    })

    await writeIamAuditEventFromHeaders(request.headers, {
      action: "erp.hrm.import.session.dry_run",
      actorUserId: org.userId,
      actorSessionId: org.sessionId,
      organizationId: org.organizationId,
      resourceType: "hrm_import_session",
      resourceId: id,
      metadata: {
        importType,
        rowCount: summary.rowCount,
        errorCount: summary.errors.length,
      },
    })

    const body = {
      ok: true as const,
      sessionId: id,
      rowCount: summary.rowCount,
      errors: summary.errors,
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: ROUTE_JSON_HEADERS,
    })
  } catch (err) {
    logUnexpectedServerError("Import dry-run failed", err, {
      area: "api",
      route: "/api/erp/hrm/import",
    })
    return routeJsonError("Import dry-run failed", 500)
  }
}
