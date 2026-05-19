"use client"

import { exportAttendanceSummaryReportAction } from "#features/hrm/client"

import { LamExportReportButton } from "./lam-export-report-button.client"

export function AttendanceExportReportButton() {
  return (
    <LamExportReportButton
      kind="attendance"
      exportAction={exportAttendanceSummaryReportAction}
    />
  )
}
