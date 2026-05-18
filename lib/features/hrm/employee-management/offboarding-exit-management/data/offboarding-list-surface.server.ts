import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import { organizationHrmEmployeePath } from "../../../constants"
import type { OffboardingChecklistTask } from "./offboarding-defaults.shared"
import type { OffboardingDashboardRow } from "./offboarding-org-dashboard.queries.server"

type OffboardingDashboardListCopy = {
  readonly title: string
  readonly description: string
  readonly empty: string
  readonly colEmployee: string
  readonly colExitType: string
  readonly colStatus: string
  readonly colLastWorking: string
  readonly colTasks: string
  readonly colSettlement: string
  readonly taskCounts: (input: { pending: number; overdue: number }) => string
  readonly emptyValue: string
}

type OffboardingChecklistListCopy = {
  readonly title: string
  readonly description: string
  readonly empty: string
  readonly colTask: string
  readonly colOwner: string
  readonly colStatus: string
  readonly colDue: string
  readonly colCompleted: string
  readonly emptyValue: string
  readonly pendingStatus: string
}

function formatEmployee(row: OffboardingDashboardRow): string {
  return row.employeeNumber
    ? `${row.legalName} (${row.employeeNumber})`
    : row.legalName
}

export function buildOffboardingDashboardListSurfaceConfiguration(
  rows: readonly OffboardingDashboardRow[],
  orgSlug: string,
  copy: OffboardingDashboardListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "employee",
      function: "search",
    },
    presentation: {
      variant: "table-only",
      tableDensity: "compact",
    },
    surface: {
      header: {
        eyebrow: copy.title,
        title: copy.title,
        description: copy.description,
      },
      columnsId: "hrm-offboarding-dashboard",
      rowKey: "id",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "employee", header: copy.colEmployee, cellKind: { kind: "link" } },
      { id: "exitType", header: copy.colExitType },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
      {
        id: "lastWorking",
        header: copy.colLastWorking,
        cellKind: { kind: "date" },
      },
      { id: "tasks", header: copy.colTasks },
      {
        id: "settlement",
        header: copy.colSettlement,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      rowHref: organizationHrmEmployeePath(orgSlug, row.employeeId),
      linkColumnId: "employee",
      cells: {
        employee: formatEmployee(row),
        exitType: row.exitType ?? copy.emptyValue,
        status: row.status,
        lastWorking: row.lastWorkingDate ?? copy.emptyValue,
        tasks: copy.taskCounts({
          pending: row.pendingTaskCount,
          overdue: row.overdueTaskCount,
        }),
        settlement: row.settlementReadinessStatus,
      },
    })),
  }
}

export function buildOffboardingChecklistListSurfaceConfiguration(
  tasks: readonly OffboardingChecklistTask[],
  copy: OffboardingChecklistListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "employee",
      function: "read",
    },
    presentation: {
      variant: "table-only",
      tableDensity: "compact",
    },
    surface: {
      header: {
        eyebrow: copy.title,
        title: copy.title,
        description: copy.description,
      },
      columnsId: "hrm-offboarding-checklist",
      rowKey: "taskKey",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "task", header: copy.colTask },
      { id: "owner", header: copy.colOwner },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "due", header: copy.colDue, cellKind: { kind: "date" } },
      {
        id: "completed",
        header: copy.colCompleted,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: tasks.map((task) => ({
      id: task.taskKey,
      cells: {
        task: task.title ?? task.taskKey,
        owner: task.assignedRole,
        status:
          task.status ?? (task.completedAt ? "completed" : copy.pendingStatus),
        due: task.dueDate ?? copy.emptyValue,
        completed: task.completedAt ?? copy.emptyValue,
      },
    })),
  }
}
