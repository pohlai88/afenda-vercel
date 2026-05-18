import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { TrainingPrerequisiteRow } from "./training-prerequisite.server"

const TRAINING_READ_PERMISSION = {
  module: "hrm" as const,
  object: "training" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type TrainingPrerequisitesListCopy = {
  empty: string
  colCourse: string
  colRequires: string
  colRequired: string
  requiredLabel: string
  optionalLabel: string
  courseLabelFor: (courseId: string) => string
}

export function buildTrainingPrerequisitesListSurfaceConfiguration(
  rows: readonly TrainingPrerequisiteRow[],
  copy: TrainingPrerequisitesListCopy,
  options: { showTrailing: boolean }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: TRAINING_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-training-prerequisites" },
      columnsId: "hrm-training-prerequisites",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "course", header: copy.colCourse },
      { id: "requires", header: copy.colRequires },
      { id: "required", header: copy.colRequired },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        course: copy.courseLabelFor(row.courseId),
        requires: `${row.prerequisiteCourseCode} — ${row.prerequisiteCourseName}`,
        required: row.required ? copy.requiredLabel : copy.optionalLabel,
      },
      trailingAction: options.showTrailing
        ? { state: "ready" as const }
        : { state: "hidden" as const },
    })),
  }
}
