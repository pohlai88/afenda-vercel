import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import type {
  HrmTrainingAssignmentRow,
  HrmTrainingCourseRow,
} from "../data/training.types.shared"
type EmployeeChoice = {
  readonly id: string
  readonly employeeNumber: string
  readonly legalName: string
}

type TrainingAssignmentBoardProps = {
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
  formatDate: (value: Date) => string
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
    fieldEmployee: string
    fieldCourse: string
    fieldDue: string
  }
}

export function TrainingAssignmentBoard({
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
}: TrainingAssignmentBoardProps) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{labels.boardTitle}</CardTitle>
        <CardDescription>{labels.boardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isHrmAdmin ? (
          <form action={assignAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <select
              name="employeeId"
              required
              className="flex h-9 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employeeNumber} — {e.legalName}
                </option>
              ))}
            </select>
            <select
              name="courseId"
              required
              className="flex h-9 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <input
              name="dueAt"
              type="date"
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              {labels.assign}
            </button>
          </form>
        ) : null}

        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.colEmployee}</TableHead>
                <TableHead>{labels.colCourse}</TableHead>
                <TableHead>{labels.colDue}</TableHead>
                <TableHead>{labels.colState}</TableHead>
                <TableHead>{labels.colPriority}</TableHead>
                {isHrmAdmin ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.employeeNumber} — {row.employeeName}
                  </TableCell>
                  <TableCell>{row.courseName}</TableCell>
                  <TableCell>
                    {row.dueAt ? formatDate(row.dueAt) : "—"}
                  </TableCell>
                  <TableCell>{row.state}</TableCell>
                  <TableCell>{row.priority}</TableCell>
                  {isHrmAdmin ? (
                    <TableCell className="space-x-2">
                      <form action={completeAction} className="inline">
                        <input
                          type="hidden"
                          name="organizationId"
                          value={organizationId}
                        />
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={row.id}
                        />
                        <input
                          type="hidden"
                          name="courseId"
                          value={row.courseId}
                        />
                        <input
                          type="hidden"
                          name="employeeId"
                          value={row.employeeId}
                        />
                        <input type="hidden" name="completedAt" value={today} />
                        <button
                          type="submit"
                          className="text-xs text-primary hover:underline"
                        >
                          {labels.complete}
                        </button>
                      </form>
                      <form action={waiveAction} className="inline">
                        <input
                          type="hidden"
                          name="organizationId"
                          value={organizationId}
                        />
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={row.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {labels.waive}
                        </button>
                      </form>
                      <form action={cancelAction} className="inline">
                        <input
                          type="hidden"
                          name="organizationId"
                          value={organizationId}
                        />
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={row.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-destructive hover:underline"
                        >
                          {labels.cancel}
                        </button>
                      </form>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
