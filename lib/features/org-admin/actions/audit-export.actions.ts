"use server"

import {
  buildOrganizationIamAuditCsv,
  canActInOrganization,
  listOrganizationIamAuditEventsForExport,
  writeIamAuditEventFromNextHeaders,
  type OrganizationIamAuditOriginFilter,
} from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

export type OrgAuditExportState =
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }
  | null

export async function exportOrganizationIamAuditCsvAction(
  formData?: FormData
): Promise<OrgAuditExportState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return { ok: false, error: "Admin access required." }
  }

  const includeSimulated =
    formData?.get("includeSimulated") === "on" ||
    formData?.get("includeSimulated") === "true"

  let auditOriginFilter: OrganizationIamAuditOriginFilter = "production"
  if (includeSimulated) {
    auditOriginFilter = "all"
    await writeIamAuditEventFromNextHeaders({
      action: "org.governance.export.include_simulated",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "governance.audit_export",
      resourceId: session.organizationId,
    })
  }

  const rows = await listOrganizationIamAuditEventsForExport({
    organizationId: session.organizationId,
    auditOriginFilter,
  })
  const csv = buildOrganizationIamAuditCsv(rows)
  const day = new Date().toISOString().slice(0, 10)
  const filename = `org-iam-audit-${day}.csv`

  return { ok: true, csv, filename }
}
