"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { HRM_OTM_AUDIT } from "../otm.contract"
import { buildOtmOperationalReportCsv } from "../data/otm-report-export.shared"
import { listOtmRequestsForOrg } from "../data/otm.queries.server"

export async function exportOtmOperationalReportCsvAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "overtime",
      function: "read",
    },
  })
  if (!allowed) {
    return { ok: false, error: "You are not authorized to export this report." }
  }

  const rows = await listOtmRequestsForOrg(organizationId, { limit: 500 })
  const asOf = new Date().toISOString().slice(0, 10)
  const csv = buildOtmOperationalReportCsv(rows)
  const filename = `overtime-requests-${asOf}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_OTM_AUDIT.reportExport,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_overtime_report",
      resourceId: `operational-${asOf}`,
      metadata: { rowCount: rows.length, format: "csv" },
    })
  )

  return { ok: true, csv, filename }
}
