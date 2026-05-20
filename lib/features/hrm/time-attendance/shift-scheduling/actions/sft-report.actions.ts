"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import { HRM_SFT_AUDIT } from "../sft.contract"
import { rosterRangeSchema } from "../schemas/sft.schema"
import { buildSftRosterReportCsv } from "../data/sft-report-export.shared"
import { listRosterAssignmentsForOrg } from "../data/sft-roster.queries.server"

export async function exportShiftRosterCsvAction(
  formData: FormData
): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "shift_schedule",
      function: "read",
    },
  })
  if (!allowed) {
    return { ok: false, error: "You are not authorized to export this report." }
  }

  const parsed = rosterRangeSchema.safeParse({
    rangeStart: formData.get("rangeStart"),
    rangeEnd: formData.get("rangeEnd"),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid range.",
    }
  }
  if (parsed.data.rangeStart > parsed.data.rangeEnd) {
    return { ok: false, error: "Range end must be on or after start." }
  }

  const rows = await listRosterAssignmentsForOrg({
    organizationId,
    rangeStart: parsed.data.rangeStart,
    rangeEnd: parsed.data.rangeEnd,
  })
  const csv = buildSftRosterReportCsv(rows)
  const filename = `shift-roster-${parsed.data.rangeStart}_${parsed.data.rangeEnd}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_SFT_AUDIT.reportExport,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_shift_schedule_report",
      resourceId: filename,
      metadata: {
        rowCount: rows.length,
        format: "csv",
        rangeStart: parsed.data.rangeStart,
        rangeEnd: parsed.data.rangeEnd,
      },
    })
  )

  return { ok: true, csv, filename }
}
