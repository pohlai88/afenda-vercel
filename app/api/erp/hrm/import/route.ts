import { createHash } from "node:crypto"

import { put } from "@vercel/blob"

import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmImportSession } from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"
import {
  ROUTE_JSON_HEADERS,
  routeJsonError,
} from "#lib/api/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  dryRunEmployees,
  parseCsv,
} from "#features/tools/server"
import {
  HRM_IMPORT_TYPES,
  hrmImportTypeSchema,
} from "#features/tools"
import { HRM_BULK_IMPORT_AUDIT } from "#features/tools"

/** Max upload body for inline CSV staging (bytes). */
const HRM_IMPORT_MAX_BYTES = 5_000_000

function importSourceBlobPath(organizationId: string, sessionId: string): string {
  return `hrm/imports/${organizationId}/${sessionId}/source.csv`
}

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

    const sessionOrgSlug = await getOrganizationSlugById(org.organizationId)
    if (
      !sessionOrgSlug ||
      normalizeOrgSlugParam(orgSlug) !== sessionOrgSlug
    ) {
      return routeJsonError("orgSlug does not match active organization", 400)
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

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes.byteLength > HRM_IMPORT_MAX_BYTES) {
      return routeJsonError(
        `CSV exceeds maximum size (${HRM_IMPORT_MAX_BYTES} bytes)`,
        413
      )
    }

    const text = new TextDecoder().decode(bytes)
    const rows = parseCsv(text)
    const summary = dryRunEmployees(rows)

    const errorJson =
      summary.errors.length > 0 ? { rows: summary.errors } : null
    const contentSha256 = createHash("sha256").update(text).digest("hex")

    const id = crypto.randomUUID()

    let rollbackJson:
      | {
          kind: "hrm_import_v1"
          importType: "employees"
          contentSha256: string
          blobUrl: string
        }
      | {
          kind: "hrm_import_placeholder"
          importType: string
          contentSha256: string
        }

    if (summary.errors.length === 0 && summary.rowCount > 0) {
      const blob = await put(importSourceBlobPath(org.organizationId, id), text, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "text/csv",
      })
      rollbackJson = {
        kind: "hrm_import_v1",
        importType: "employees",
        contentSha256,
        blobUrl: blob.url,
      }
    } else {
      rollbackJson = {
        kind: "hrm_import_placeholder",
        importType,
        contentSha256,
      }
    }

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
      action: HRM_BULK_IMPORT_AUDIT.sessionDryRun,
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
