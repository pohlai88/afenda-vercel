"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { HRM_FWA_AUDIT } from "../fwa.contract"
import { buildFwaOperationalReportCsv } from "../data/fwa-report-export.shared"
import { listFwaRequestsForOrg } from "../data/fwa.queries.server"

export async function exportFwaOperationalReportCsvAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "flexible_work",
      function: "read",
    },
  })
  if (!allowed) {
    return { ok: false, error: "You are not authorized to export this report." }
  }

  const rows = await listFwaRequestsForOrg(organizationId, { limit: 500 })
  const asOf = new Date().toISOString().slice(0, 10)
  const csv = buildFwaOperationalReportCsv(rows)
  const filename = `flexible-work-arrangements-${asOf}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_FWA_AUDIT.reportExport,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_flexible_work_report",
      resourceId: `operational-${asOf}`,
      metadata: { rowCount: rows.length, format: "csv" },
    })
  )

  return { ok: true, csv, filename }
}
