"use server"

import {
  buildOrganizationIamAuditCsv,
  listOrganizationIamAuditEventsForExport,
  writeIamAuditEventFromNextHeaders,
  type OrganizationIamAuditOriginFilter,
} from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"

export type OrgAuditExportState =
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }
  | null

export async function exportOrganizationIamAuditCsvAction(
  formData?: FormData
): Promise<OrgAuditExportState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }
  const session = gate.session

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
