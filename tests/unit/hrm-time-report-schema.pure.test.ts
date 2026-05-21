import { describe, expect, it } from "vitest"

import { HRM_TIME_REPORT_OVERTIME_RETIRED_MESSAGE } from "../../lib/features/hrm/time-attendance/leave-attendance-management/data/time-report-policy.shared"
import { submitTimeReportFormSchema } from "../../lib/features/hrm/time-attendance/leave-attendance-management/schemas/time-report.schema"

describe("submitTimeReportFormSchema", () => {
  it("rejects retired overtime report kind at the schema boundary", () => {
    const r = submitTimeReportFormSchema.safeParse({
      employeeId: "00000000-0000-4000-8000-000000000001",
      reportKind: "overtime",
      workDate: "2026-05-01",
      overtimeMinutes: 120,
    })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.flatten().fieldErrors.reportKind?.[0]).toBe(
      HRM_TIME_REPORT_OVERTIME_RETIRED_MESSAGE
    )
  })

  it("accepts valid business trip payload", () => {
    const r = submitTimeReportFormSchema.safeParse({
      employeeId: "00000000-0000-4000-8000-000000000001",
      reportKind: "business_trip",
      tripStartDate: "2026-05-01",
      tripEndDate: "2026-05-05",
      destination: "Hanoi",
    })
    expect(r.success).toBe(true)
  })

  it("rejects trip end before start", () => {
    const r = submitTimeReportFormSchema.safeParse({
      employeeId: "00000000-0000-4000-8000-000000000001",
      reportKind: "business_trip",
      tripStartDate: "2026-05-10",
      tripEndDate: "2026-05-01",
    })
    expect(r.success).toBe(false)
  })
})
