"use server"

import {
  buildOrganizationIamAuditCsv,
  canActInOrganization,
  listOrganizationIamAuditEventsForExport,
} from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

export type OrgAuditExportState =
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }
  | null

export async function exportOrganizationIamAuditCsvAction(): Promise<OrgAuditExportState> {
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

  const rows = await listOrganizationIamAuditEventsForExport({
    organizationId: session.organizationId,
  })
  const csv = buildOrganizationIamAuditCsv(rows)
  const day = new Date().toISOString().slice(0, 10)
  const filename = `org-iam-audit-${day}.csv`

  return { ok: true, csv, filename }
}
