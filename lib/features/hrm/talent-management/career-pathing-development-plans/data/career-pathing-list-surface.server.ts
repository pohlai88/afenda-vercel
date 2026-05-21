import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type {
  CareerGapRow,
  CareerPathFrameworkRow,
  CareerPathStageRow,
  DevelopmentGoalRow,
  DevelopmentPlanRow,
  LearningActionRow,
  ReadinessRow,
  StretchAssignmentRow,
  TargetRoleRow,
} from "./career-pathing.types.shared"

const CAREER_PATH_READ_PERMISSION = {
  module: "hrm" as const,
  object: "career_path" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

export function buildCareerPathFrameworksListSurfaceConfiguration(
  rows: readonly CareerPathFrameworkRow[],
  copy: {
    title: string
    description: string
    empty: string
    colCode: string
    colName: string
    colKind: string
    colStatus: string
    colStages: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-frameworks",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "kind", header: copy.colKind },
      { id: "status", header: copy.colStatus },
      { id: "stages", header: copy.colStages },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        code: row.code,
        name: row.name,
        kind: row.pathKind,
        status: row.status,
        stages: String(row.stageCount),
      },
      trailingAction:
        row.status === "draft" ||
        row.status === "active" ||
        row.status === "archived"
          ? { state: "ready" as const }
          : undefined,
    })),
  }
}

export function buildCareerPathStagesListSurfaceConfiguration(
  rows: readonly CareerPathStageRow[],
  copy: {
    title: string
    description: string
    empty: string
    colSequence: string
    colTitle: string
    colGrade: string
    colMonths: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-framework-stages",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "sequence", header: copy.colSequence },
      { id: "title", header: copy.colTitle },
      { id: "grade", header: copy.colGrade },
      { id: "months", header: copy.colMonths },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        sequence: String(row.sequence),
        title: row.title,
        grade: row.targetGradeRef ?? "—",
        months: row.expectedMonths != null ? String(row.expectedMonths) : "—",
      },
      trailingAction: { state: "ready" as const },
    })),
  }
}

export function buildTargetRolesListSurfaceConfiguration(
  rows: readonly TargetRoleRow[],
  copy: {
    title: string
    description: string
    empty: string
    colEmployee: string
    colTarget: string
    colSource: string
    colFramework: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-target-roles",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "target", header: copy.colTarget },
      { id: "source", header: copy.colSource },
      { id: "framework", header: copy.colFramework },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: `${row.employeeNumber} — ${row.employeeName}`,
        target: row.targetRoleTitle,
        source: row.source,
        framework: row.frameworkName ?? "—",
      },
    })),
  }
}

export function buildDevelopmentPlansListSurfaceConfiguration(
  rows: readonly DevelopmentPlanRow[],
  copy: {
    title: string
    description: string
    empty: string
    colEmployee: string
    colTitle: string
    colStatus: string
    colGoals: string
    colOverdue: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-plans",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "title", header: copy.colTitle },
      { id: "status", header: copy.colStatus },
      { id: "goals", header: copy.colGoals },
      { id: "overdue", header: copy.colOverdue },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        employee: row.employeeName,
        title: row.title,
        status: row.status,
        goals: String(row.goalCount),
        overdue: String(row.overdueMilestoneCount),
      },
    })),
  }
}

export function buildPlanGoalsListSurfaceConfiguration(
  goals: readonly DevelopmentGoalRow[],
  copy: {
    empty: string
    colTitle: string
    colType: string
    colStatus: string
    colMilestones: string
    colDue: string
    formatDue: (value: Date) => string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "plan-goals" },
      columnsId: "hrm-career-path-plan-goals",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      { id: "type", header: copy.colType },
      { id: "status", header: copy.colStatus },
      { id: "milestones", header: copy.colMilestones },
      { id: "due", header: copy.colDue },
    ],
    rows: goals.map((goal) => ({
      id: goal.id,
      cells: {
        title: goal.title,
        type: goal.goalType,
        status: goal.status,
        milestones: String(goal.milestoneCount),
        due: goal.targetDate ? copy.formatDue(goal.targetDate) : "—",
      },
      trailingAction:
        goal.status !== "completed" && goal.status !== "cancelled"
          ? { state: "ready" as const }
          : undefined,
    })),
  }
}

export function buildSkillGapsListSurfaceConfiguration(
  gaps: readonly CareerGapRow[],
  copy: {
    title: string
    description: string
    empty: string
    colSkill: string
    colCurrent: string
    colTarget: string
    colGap: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-skill-gaps",
      rowKey: "skillName",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "skill", header: copy.colSkill },
      { id: "current", header: copy.colCurrent },
      { id: "target", header: copy.colTarget },
      { id: "gap", header: copy.colGap },
    ],
    rows: gaps.map((gap) => ({
      id: gap.skillName,
      cells: {
        skill: gap.skillName,
        current: gap.currentLevel,
        target: gap.targetLevel,
        gap: gap.gap,
      },
    })),
  }
}

export function buildReadinessListSurfaceConfiguration(
  rows: readonly ReadinessRow[],
  copy: {
    title: string
    description: string
    empty: string
    colEmployee: string
    colTarget: string
    colReadiness: string
    colProgress: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-readiness",
      rowKey: "employeeId",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "target", header: copy.colTarget },
      { id: "readiness", header: copy.colReadiness },
      { id: "progress", header: copy.colProgress },
    ],
    rows: rows.map((row) => ({
      id: row.employeeId,
      cells: {
        employee: row.employeeName,
        target: row.targetRoleTitle ?? "—",
        readiness: row.readinessLevel,
        progress: `${row.progressPercent}%`,
      },
    })),
  }
}

export function buildLearningActionsListSurfaceConfiguration(
  rows: readonly LearningActionRow[],
  copy: {
    title: string
    description: string
    empty: string
    colTitle: string
    colGoal: string
    colCourse: string
    colStatus: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-learning-actions",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      { id: "goal", header: copy.colGoal },
      { id: "course", header: copy.colCourse },
      { id: "status", header: copy.colStatus },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        title: row.title,
        goal: row.goalTitle,
        course: row.courseName ?? "—",
        status: row.status,
      },
    })),
  }
}

export function buildStretchAssignmentsListSurfaceConfiguration(
  rows: readonly StretchAssignmentRow[],
  copy: {
    title: string
    description: string
    empty: string
    colTitle: string
    colKind: string
    colStatus: string
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: copy.title, description: copy.description },
      columnsId: "hrm-career-path-stretch-assignments",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      { id: "kind", header: copy.colKind },
      { id: "status", header: copy.colStatus },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        title: row.title,
        kind: row.assignmentKind ?? "—",
        status: row.status,
      },
    })),
  }
}

export function buildDashboardKpiSurfaceConfiguration(input: {
  activeFrameworks: number
  activePlans: number
  overdueMilestones: number
  nearReadyCount: number
  labels: {
    frameworks: string
    plans: string
    overdue: string
    nearReady: string
  }
}): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: CAREER_PATH_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "career-pathing-dashboard-kpi" },
      columnsId: "hrm-career-path-dashboard-kpi",
      rowKey: "id",
      empty: { variant: "muted", title: "—" },
    },
    columns: [{ id: "label", header: "" }, { id: "value", header: "" }],
    rows: [
      {
        id: "frameworks",
        cells: {
          label: input.labels.frameworks,
          value: String(input.activeFrameworks),
        },
      },
      {
        id: "plans",
        cells: {
          label: input.labels.plans,
          value: String(input.activePlans),
        },
      },
      {
        id: "overdue",
        cells: {
          label: input.labels.overdue,
          value: String(input.overdueMilestones),
        },
      },
      {
        id: "near-ready",
        cells: {
          label: input.labels.nearReady,
          value: String(input.nearReadyCount),
        },
      },
    ],
  }
}
