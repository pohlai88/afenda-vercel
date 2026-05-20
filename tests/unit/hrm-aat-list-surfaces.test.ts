import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import { AAT_LIST_SURFACE_IDS } from "../../lib/features/hrm/time-attendance/absence-analytics-trends/data/aat-surface-metadata.shared.ts"
import {
  buildAatDepartmentRankingListSurface,
  buildAatExceptionTrendsListSurface,
  buildAatHighRiskEmployeesListSurface,
  buildAatLeaveTypeBreakdownListSurface,
} from "../../lib/features/hrm/time-attendance/absence-analytics-trends/data/aat-list-surface.server.ts"
import {
  buildAatKpiStatConfiguration,
  buildAatDailyHeatmapChartConfiguration,
} from "../../lib/features/hrm/time-attendance/absence-analytics-trends/data/aat-surface-builders.server.ts"
import { parseUpdateAatThresholdFormData } from "../../lib/features/hrm/time-attendance/absence-analytics-trends/schemas/aat-threshold-action.schema.ts"

const riskLabelFor = (tier: string) => tier

describe("HRM AAT metadata list-surface builders", () => {
  it("builds KPI stat configuration with trend copy", () => {
    const config = buildAatKpiStatConfiguration(
      {
        scope: "org",
        period: "30d",
        range: {
          startDate: "2026-04-20",
          endDate: "2026-05-19",
          priorStartDate: "2026-03-21",
          priorEndDate: "2026-04-19",
        },
        calendarDays: 30,
        activeEmployeeCount: 10,
        lostWorkdays: 15,
        absenceFrequency: 8,
        absenceRate: 0.05,
        priorAbsenceRate: 0.04,
        trendDirection: "worsening",
        plannedLostWorkdays: 6,
        unplannedLostWorkdays: 9,
        availabilityRate: 0.95,
        coverageRisk: false,
        mondayFridayAbsenceCount: 2,
        shortAbsencePatternCount: 1,
        holidayAdjacentAbsenceCount: 3,
        departmentRanking: [],
        highRiskEmployees: [],
        exceptionTrends: [],
        leaveTypeBreakdown: [],
        weeklyTrend: [],
        dailyHeatmap: [],
      },
      {
        absenceRate: "Absence rate",
        lostWorkdays: "Lost workdays",
        absenceFrequency: "Frequency",
        availability: "Availability",
        trend: "Trend",
        plannedVsUnplanned: "Planned / unplanned",
        coverageRisk: "Coverage risk",
        patternSignals: "Patterns",
        trendDirectionLabel: "Worsening",
        trendTone: "attention",
      }
    )

    expect(config.stats).toHaveLength(5)
    expect(config.stats[0]?.tone).toBe("attention")
  })

  it("builds department ranking list with stable surfaceKey", () => {
    const config = buildAatDepartmentRankingListSurface(
      [
        {
          departmentId: "dept-1",
          departmentName: "Operations",
          employeeCount: 5,
          lostWorkdays: 3,
          absenceRate: 0.12,
          riskTier: "at_risk",
        },
      ],
      {
        empty: "Empty",
        colDepartment: "Department",
        colEmployees: "Employees",
        colLostDays: "Lost days",
        colRate: "Rate",
        colRisk: "Risk",
        riskLabelFor,
      }
    )

    expect(config.surface.columnsId).toBe(
      AAT_LIST_SURFACE_IDS.departmentRanking
    )
    expect(parseListSurfaceRendererConfiguration(config).success).toBe(true)
  })

  it("builds leave type breakdown list surface", () => {
    const config = buildAatLeaveTypeBreakdownListSurface(
      [
        {
          leaveTypeCode: "annual",
          lostWorkdays: 12,
          absenceFrequency: 4,
        },
      ],
      {
        empty: "Empty",
        colLeaveType: "Leave type",
        colLostDays: "Lost days",
        colFrequency: "Frequency",
        labelFor: (code) => code.toUpperCase(),
      }
    )

    expect(config.surface.columnsId).toBe(
      AAT_LIST_SURFACE_IDS.leaveTypeBreakdown
    )
    expect(config.rows[0]?.cells.leaveType).toBe("ANNUAL")
  })

  it("builds high-risk and exception trend surfaces", () => {
    const highRisk = buildAatHighRiskEmployeesListSurface(
      [
        {
          employeeId: "emp-1",
          employeeLabel: "Alex · E001",
          departmentName: "Ops",
          absenceFrequency: 6,
          lostWorkdays: 4,
          absenceRate: 0.2,
          riskTier: "high_risk",
          patternFlags: ["Mon/Fri pattern"],
          recentAbsenceReason: "Restricted",
        },
      ],
      {
        empty: "Empty",
        colEmployee: "Employee",
        colDepartment: "Department",
        colFrequency: "Frequency",
        colLostDays: "Lost days",
        colRate: "Rate",
        colRisk: "Risk",
        colPatterns: "Patterns",
        colReason: "Reason",
        riskLabelFor,
      }
    )

    const exceptions = buildAatExceptionTrendsListSurface(
      [{ exceptionKind: "late_arrival", count: 3 }],
      {
        empty: "Empty",
        colKind: "Kind",
        colCount: "Count",
        labelFor: () => "Late",
      }
    )

    expect(highRisk.surface.columnsId).toBe(
      AAT_LIST_SURFACE_IDS.highRiskEmployees
    )
    expect(exceptions.rows[0]?.cells.kind).toBe("Late")
  })

  it("builds daily heatmap chart configuration", () => {
    const config = buildAatDailyHeatmapChartConfiguration(
      {
        scope: "org",
        period: "30d",
        range: {
          startDate: "2026-05-01",
          endDate: "2026-05-03",
          priorStartDate: "2026-04-01",
          priorEndDate: "2026-04-30",
        },
        calendarDays: 3,
        activeEmployeeCount: 5,
        lostWorkdays: 2,
        absenceFrequency: 1,
        absenceRate: 0.01,
        priorAbsenceRate: 0.01,
        trendDirection: "stable",
        plannedLostWorkdays: 1,
        unplannedLostWorkdays: 1,
        availabilityRate: 0.99,
        coverageRisk: false,
        mondayFridayAbsenceCount: 0,
        shortAbsencePatternCount: 0,
        holidayAdjacentAbsenceCount: 0,
        departmentRanking: [],
        highRiskEmployees: [],
        exceptionTrends: [],
        leaveTypeBreakdown: [],
        weeklyTrend: [],
        dailyHeatmap: [
          { date: "2026-05-01", lostWorkdays: 1 },
          { date: "2026-05-02", lostWorkdays: 0 },
        ],
      },
      "Daily heatmap"
    )

    expect(config.chartKind).toBe("bar")
    expect(config.series[0]?.points).toHaveLength(2)
  })

  it("parses threshold form rates from percent inputs", () => {
    const formData = new FormData()
    formData.set("watchAbsenceRate", "8")
    formData.set("atRiskAbsenceRate", "12")
    formData.set("highRiskAbsenceRate", "18")
    formData.set("criticalAbsenceRate", "25")
    formData.set("watchFrequency", "3")
    formData.set("atRiskFrequency", "5")
    formData.set("highRiskFrequency", "8")

    const parsed = parseUpdateAatThresholdFormData(formData)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.watchAbsenceRate).toBeCloseTo(0.08)
      expect(parsed.data.criticalAbsenceRate).toBeCloseTo(0.25)
    }
  })
})
