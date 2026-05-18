import { GovernedPatternCListSection } from "#features/governed-surface"
import { Button } from "#components2/ui/button"
import { NativeSelect, NativeSelectOption } from "#components2/ui/native-select"

import { buildTrainingAssignmentListSurfaceConfiguration } from "../data/training-list-surface.server"
import type {
  HrmTrainingAssignmentRow,
  HrmTrainingCourseRow,
} from "../data/training.types.shared"

import { TrainingAssignmentRowActions } from "./training-assignment-row-actions.client"

type EmployeeChoice = {
  readonly id: string
  readonly employeeNumber: string
  readonly legalName: string
}

type TrainingAssignmentSectionProps = {
  assignments: readonly HrmTrainingAssignmentRow[]
  courses: readonly HrmTrainingCourseRow[]
  employees: readonly EmployeeChoice[]
  orgSlug: string
  organizationId: string
  isHrmAdmin: boolean
  assignAction: (formData: FormData) => void | Promise<void>
  waiveAction: (formData: FormData) => void | Promise<void>
  cancelAction: (formData: FormData) => void | Promise<void>
  completeAction: (formData: FormData) => void | Promise<void>
  formatDate: (value: Date | null) => string
  labels: {
    boardTitle: string
    boardDescription: string
    colEmployee: string
    colCourse: string
    colDue: string
    colState: string
    colPriority: string
    assign: string
    waive: string
    cancel: string
    complete: string
    empty: string
  }
}

export async function TrainingAssignmentSection({
  assignments,
  courses,
  employees,
  orgSlug,
  organizationId,
  isHrmAdmin,
  assignAction,
  waiveAction,
  cancelAction,
  completeAction,
  formatDate,
  labels,
}: TrainingAssignmentSectionProps) {
  const today = new Date().toISOString().slice(0, 10)
  const listConfiguration = buildTrainingAssignmentListSurfaceConfiguration(
    assignments,
    {
      empty: labels.empty,
      colEmployee: labels.colEmployee,
      colCourse: labels.colCourse,
      colDue: labels.colDue,
      colState: labels.colState,
      colPriority: labels.colPriority,
      formatDue: formatDate,
    }
  )
  const assignmentById = new Map(assignments.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={labels.boardTitle}
      description={labels.boardDescription}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:training:assignments"
      cardClassName="mt-0"
      contentClassName="flex flex-col gap-4"
      contentBeforeList={
        isHrmAdmin ? (
          <form
            action={assignAction}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <NativeSelect name="employeeId" required className="min-w-[12rem]">
              {employees.map((employee) => (
                <NativeSelectOption key={employee.id} value={employee.id}>
                  {employee.employeeNumber} — {employee.legalName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect name="courseId" required className="min-w-[12rem]">
              {courses.map((course) => (
                <NativeSelectOption key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <input
              name="dueAt"
              type="date"
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button type="submit" size="sm">
              {labels.assign}
            </Button>
          </form>
        ) : null
      }
      trailingColumn={
        isHrmAdmin
          ? {
              header: "",
              render: (surfaceRow) => {
                const row = assignmentById.get(surfaceRow.id)
                if (!row) return null
                return (
                  <TrainingAssignmentRowActions
                    organizationId={organizationId}
                    orgSlug={orgSlug}
                    assignmentId={row.id}
                    courseId={row.courseId}
                    employeeId={row.employeeId}
                    completedAt={today}
                    completeAction={completeAction}
                    waiveAction={waiveAction}
                    cancelAction={cancelAction}
                    labels={{
                      complete: labels.complete,
                      waive: labels.waive,
                      cancel: labels.cancel,
                    }}
                  />
                )
              },
            }
          : undefined
      }
    />
  )
}
