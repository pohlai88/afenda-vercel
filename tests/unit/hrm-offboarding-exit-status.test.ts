import { describe, expect, it } from "vitest"

import { buildDefaultOffboardingChecklist } from "../../lib/features/hrm/employee-management/offboarding-exit-management/data/offboarding-defaults.shared"
import { buildOffboardingDashboardListSurfaceConfiguration } from "../../lib/features/hrm/employee-management/offboarding-exit-management/data/offboarding-list-surface.server"
import {
  buildDefaultOffboardingClearanceItems,
  buildOffboardingApprovalSteps,
} from "../../lib/features/hrm/employee-management/offboarding-exit-management/data/offboarding.mutations.server"
import {
  isOffboardingChecklistComplete,
  deriveOffboardingTaskStatus,
} from "../../lib/features/hrm/employee-management/offboarding-exit-management/data/offboarding-exit-status.shared"
import { HRM_OFFBOARDING_TASK_KEYS } from "../../lib/features/hrm/employee-management/offboarding-exit-management/schemas/offboarding.schema"

describe("offboarding checklist defaults", () => {
  it("includes every HRM-OFF task key", () => {
    const checklist = buildDefaultOffboardingChecklist()
    expect(checklist).toHaveLength(HRM_OFFBOARDING_TASK_KEYS.length)
    expect(checklist).toHaveLength(11)
    for (const key of HRM_OFFBOARDING_TASK_KEYS) {
      expect(checklist.some((task) => task.taskKey === key)).toBe(true)
    }
  })

  it("assigns tasks across HR, manager, employee, IT, finance, payroll, and asset owners", () => {
    const roles = new Set(
      buildDefaultOffboardingChecklist().map((task) => task.assignedRole)
    )
    expect(roles).toEqual(
      new Set([
        "hr",
        "manager",
        "employee",
        "asset_owner",
        "it",
        "finance",
        "payroll",
      ])
    )
  })
})

describe("deriveOffboardingTaskStatus", () => {
  it("marks incomplete tasks pending", () => {
    expect(deriveOffboardingTaskStatus({ completedAt: null })).toBe("pending")
  })

  it("marks past-due tasks overdue", () => {
    expect(
      deriveOffboardingTaskStatus({
        completedAt: null,
        dueDate: "2020-01-01",
        now: new Date("2026-05-01"),
      })
    ).toBe("overdue")
  })
})

describe("isOffboardingChecklistComplete", () => {
  it("requires every task completed", () => {
    const checklist = buildDefaultOffboardingChecklist().map(() => ({
      completedAt: new Date().toISOString(),
    }))
    expect(isOffboardingChecklistComplete(checklist)).toBe(true)
  })

  it("treats waived tasks as closed", () => {
    expect(
      isOffboardingChecklistComplete([
        { completedAt: new Date().toISOString() },
        { completedAt: null, status: "waived" },
      ])
    ).toBe(true)
  })
})

describe("offboarding approval and clearance defaults", () => {
  it("adds management and legal approval for terminations", () => {
    expect(
      buildOffboardingApprovalSteps({ exitType: "termination" }).map(
        (step) => step.stepKey
      )
    ).toEqual([
      "manager_review",
      "hr_review",
      "management_review",
      "legal_review",
    ])
  })

  it("generates normalized clearance references", () => {
    const items = buildDefaultOffboardingClearanceItems({
      lastWorkingDate: "2026-05-31",
    })
    expect(items.map((item) => item.itemKey)).toContain("asset_recovery")
    expect(items.map((item) => item.itemKey)).toContain("access_revocation")
    expect(items.every((item) => item.dueAt instanceof Date)).toBe(true)
  })
})

describe("offboarding metadata list surfaces", () => {
  it("emits governed table configuration with ERP search permission", () => {
    const config = buildOffboardingDashboardListSurfaceConfiguration(
      [
        {
          id: "case-1",
          employeeId: "employee-1",
          employeeNumber: "E-001",
          legalName: "Asha Tan",
          status: "open",
          exitType: "resignation",
          terminationDate: "2026-05-31",
          lastWorkingDate: "2026-05-31",
          settlementReadinessStatus: "pending_clearance",
          pendingTaskCount: 2,
          overdueTaskCount: 1,
          updatedAt: new Date("2026-05-01T00:00:00.000Z"),
        },
      ],
      "acme",
      {
        title: "Active exit cases",
        description: "Exit cases",
        empty: "No cases",
        colEmployee: "Employee",
        colExitType: "Exit type",
        colStatus: "Status",
        colLastWorking: "Last working",
        colTasks: "Tasks",
        colSettlement: "Settlement",
        emptyValue: "Not set",
        taskCounts: ({ pending, overdue }) =>
          `${pending} pending / ${overdue} overdue`,
      }
    )

    expect(config.dataNature).toBe("table")
    expect(config.requiresErpPermission).toEqual({
      module: "hrm",
      object: "employee",
      function: "search",
    })
    expect(config.rows[0]?.rowHref).toContain("/hrm/employees/employee-1")
    expect(config.rows[0]?.cells.tasks).toBe("2 pending / 1 overdue")
  })
})
