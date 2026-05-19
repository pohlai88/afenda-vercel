"use server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { RemoteCheckinReportExportFormState } from "../../../types"
import { HRM_GEOLOCATION_AUDIT } from "../geolocation.contract"
import { buildRemoteCheckinReportCsv } from "../data/geolocation-report.server"
import { exportRemoteCheckinReportFormSchema } from "../schemas/geolocation.schema"

export async function exportRemoteCheckinReportAction(
  _prev: RemoteCheckinReportExportFormState | undefined,
  formData: FormData
): Promise<RemoteCheckinReportExportFormState> {
  const gate = await requireHrmPermission({
    object: "remote_checkin",
    function: "audit",
    errorMessage:
      "Remote check-in audit permission required to export reports.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { organizationId, userId, sessionId } = gate.session

  const parsed = exportRemoteCheckinReportFormSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    employeeId: formData.get("employeeId") || null,
    departmentId: formData.get("departmentId") || null,
    geofenceId: formData.get("geofenceId") || null,
    scopeKind: formData.get("scopeKind") || null,
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

  const report = await buildRemoteCheckinReportCsv({
    organizationId,
    filters: parsed.data,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_GEOLOCATION_AUDIT.reportExport,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_remote_checkin_report",
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
