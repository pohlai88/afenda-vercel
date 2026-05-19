"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { HRM_COMPLIANCE_REGULATORY_AUDIT } from "../compliance-regulatory.contract"
import { buildComplianceDashboardCsv } from "../data/compliance-dashboard-export.shared"
import { listComplianceDashboardRowsForOrg } from "../data/compliance-dashboard.queries.server"
import { requireComplianceSessionMutationGate } from "../data/compliance-action-guard.server"

export async function exportComplianceDashboardCsvAction(): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const gate = await requireComplianceSessionMutationGate("read")
  if (!gate.ok) return { ok: false, error: gate.error }

  const rows = await listComplianceDashboardRowsForOrg(gate.organizationId)
  const asOf = new Date().toISOString().slice(0, 10)
  const csv = buildComplianceDashboardCsv(rows)
  const filename = `compliance-dashboard-${asOf}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_COMPLIANCE_REGULATORY_AUDIT.report.exported,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_compliance_report",
      resourceId: `dashboard-${asOf}`,
      metadata: {
        rowCount: rows.length,
        format: "csv",
      },
    })
  )

  return { ok: true, csv, filename }
}
