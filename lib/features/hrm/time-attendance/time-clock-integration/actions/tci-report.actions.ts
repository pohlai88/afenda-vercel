"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { TimeClockReportExportFormState } from "../../../types"
import { HRM_TCI_AUDIT } from "../tci.contract"
import { buildTimeClockReportCsv } from "../data/tci-report.server"
import { exportTimeClockReportFormSchema } from "../schemas/tci.schema"

export async function exportTimeClockReportAction(
  _prev: TimeClockReportExportFormState | undefined,
  formData: FormData
): Promise<TimeClockReportExportFormState> {
  const gate = await requireHrmPermission({
    object: "time_clock",
    function: "audit",
    errorMessage: "Time clock audit permission required to export reports.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { organizationId, userId, sessionId } = gate.session

  const parsed = exportTimeClockReportFormSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    employeeId: formData.get("employeeId") || null,
    deviceId: formData.get("deviceId") || null,
    onlyExceptions:
      formData.get("onlyExceptions") === "on" ||
      formData.get("onlyExceptions") === "true",
  })
  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      startDate: errs.startDate?.[0],
      endDate: errs.endDate?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const report = await buildTimeClockReportCsv({
    organizationId,
    filters: parsed.data,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_TCI_AUDIT.reportExport,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_time_clock_report",
    resourceId: report.filename,
    metadata: {
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      rowCount: report.rowCount,
      onlyExceptions: parsed.data.onlyExceptions ?? false,
    },
  })

  return {
    ok: true,
    csv: report.csv,
    filename: report.filename,
    rowCount: report.rowCount,
  }
}
