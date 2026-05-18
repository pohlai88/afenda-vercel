import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

const TRAINING_READ_PERMISSION = {
  module: "hrm" as const,
  object: "training" as const,
  function: "read" as const,
}

import type { TrainingCourseCompletionStat } from "./training-analytics.queries.server"
import type {
  HrmTrainingAssignmentRow,
  HrmTrainingCourseRow,
} from "./training.types.shared"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type TrainingCatalogListCopy = {
  catalogTitle: string
  catalogDescription: string
  empty: string
  colCode: string
  colName: string
  colDelivery: string
  colStatutory: string
  colState: string
}

export function buildTrainingCatalogListSurfaceConfiguration(
  courses: readonly HrmTrainingCourseRow[],
  copy: TrainingCatalogListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: TRAINING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: {
        title: copy.catalogTitle,
        description: copy.catalogDescription,
      },
      columnsId: "hrm-training-catalog",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "code", header: copy.colCode },
      { id: "name", header: copy.colName },
      { id: "delivery", header: copy.colDelivery },
      { id: "statutory", header: copy.colStatutory },
      { id: "state", header: copy.colState },
    ],
    rows: courses.map((course) => ({
      id: course.id,
      cells: {
        code: course.code,
        name: course.name,
        delivery: course.deliveryMode,
        statutory: course.statutoryFlag
          ? (course.statutoryAuthorityCode ?? "yes")
          : "—",
        state: course.state,
      },
    })),
  }
}

type TrainingAssignmentListCopy = {
  empty: string
  colEmployee: string
  colCourse: string
  colDue: string
  colState: string
  colPriority: string
  formatDue: (value: Date) => string
}

export function buildTrainingAssignmentListSurfaceConfiguration(
  assignments: readonly HrmTrainingAssignmentRow[],
  copy: TrainingAssignmentListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: TRAINING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-training-assignments" },
      columnsId: "hrm-training-assignments",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "course", header: copy.colCourse },
      { id: "due", header: copy.colDue, cellKind: { kind: "date" } },
      { id: "state", header: copy.colState },
      { id: "priority", header: copy.colPriority },
    ],
    rows: assignments.map((row) => ({
      id: row.id,
      cells: {
        employee: `${row.employeeNumber} — ${row.employeeName}`,
        course: row.courseName,
        due: row.dueAt ? copy.formatDue(row.dueAt as Date) : "—",
        state: row.state,
        priority: row.priority,
      },
    })),
  }
}

type TrainingAnalyticsCourseListCopy = {
  empty: string
  colCourse: string
  colCompletionRate: string
  colAssignments: string
  colCompletions: string
}

export function buildTrainingAnalyticsCourseListSurfaceConfiguration(
  stats: readonly TrainingCourseCompletionStat[],
  copy: TrainingAnalyticsCourseListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: TRAINING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-training-analytics-courses" },
      columnsId: "hrm-training-analytics-courses",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "course", header: copy.colCourse },
      { id: "completionRate", header: copy.colCompletionRate, align: "end" },
      { id: "assignments", header: copy.colAssignments, align: "end" },
      { id: "completions", header: copy.colCompletions, align: "end" },
    ],
    rows: stats.map((row) => ({
      id: row.courseId,
      cells: {
        course: `${row.courseCode} ${row.courseName}`,
        completionRate: `${row.completionRate}%`,
        assignments: row.assignmentCount,
        completions: row.completedCount,
      },
    })),
  }
}

type TrainingFeedbackListCopy = {
  empty: string
  colCourse: string
  colCount: string
  colAverage: string
}

export type TrainingFeedbackAggregateRow = {
  readonly courseId: string
  readonly courseCode: string
  readonly courseName: string
  readonly feedbackCount: number
  readonly averageRating: number | null
}

export function buildTrainingFeedbackListSurfaceConfiguration(
  rows: readonly TrainingFeedbackAggregateRow[],
  copy: TrainingFeedbackListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: TRAINING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-training-feedback" },
      columnsId: "hrm-training-feedback",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "course", header: copy.colCourse },
      { id: "count", header: copy.colCount, align: "end" },
      { id: "average", header: copy.colAverage, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.courseId,
      cells: {
        course: `${row.courseCode} ${row.courseName}`,
        count: row.feedbackCount,
        average:
          row.averageRating !== null ? `${row.averageRating}/5` : "—",
      },
    })),
  }
}

type TrainingSessionRosterListCopy = {
  colEmployee: string
  colAttendance: string
  colState: string
}

export function buildTrainingSessionRosterListSurfaceConfiguration(
  roster: readonly HrmTrainingAssignmentRow[],
  copy: TrainingSessionRosterListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: TRAINING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-training-session-roster" },
      columnsId: "hrm-training-session-roster",
      rowKey: "id",
      empty: { variant: "muted", title: "—" },
    },
    columns: [
      { id: "employee", header: copy.colEmployee },
      { id: "attendance", header: copy.colAttendance },
      { id: "state", header: copy.colState },
    ],
    rows: roster.map((row) => ({
      id: row.id,
      cells: {
        employee: `${row.employeeNumber} — ${row.employeeName}`,
        attendance: row.attendance ?? "—",
        state: row.state,
      },
    })),
  }
}
