"use client"

import { exportLeaveRequestsReportAction } from "#features/hrm/client"

import { LamExportReportButton } from "./lam-export-report-button.client"

export function LeaveExportReportButton() {
  return (
    <LamExportReportButton
      kind="leave"
      exportAction={exportLeaveRequestsReportAction}
    />
  )
}
