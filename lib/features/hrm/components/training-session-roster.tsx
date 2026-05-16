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
  HrmTrainingSessionRow,
} from "../data/training.types.shared"
type EmployeeChoice = {
  readonly id: string
  readonly employeeNumber: string
  readonly legalName: string
}

type TrainingSessionRosterProps = {
  sessions: readonly HrmTrainingSessionRow[]
  assignments: readonly HrmTrainingAssignmentRow[]
  orgSlug: string
  organizationId: string
  employees: readonly EmployeeChoice[]
  formatDateTime: (value: Date) => string
  assignAction: (formData: FormData) => void | Promise<void>
  attendanceAction: (formData: FormData) => void | Promise<void>
  closeAction: (formData: FormData) => void | Promise<void>
  labels: {
    colSession: string
    colSchedule: string
    colRoster: string
    colState: string
    closeSession: string
    markPresent: string
    assignToSession: string
    empty: string
  }
}

export function TrainingSessionRoster({
  sessions,
  assignments,
  orgSlug,
  organizationId,
  employees,
  formatDateTime,
  assignAction,
  attendanceAction,
  closeAction,
  labels,
}: TrainingSessionRosterProps) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">{labels.empty}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {sessions.map((session) => {
        const roster = assignments.filter((a) => a.sessionId === session.id)
        const open =
          session.state === "scheduled" || session.state === "in_progress"

        return (
          <div key={session.id} className="rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {session.code} — {session.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.courseName} · {session.location}
                </p>
              </div>
              {open ? (
                <form action={closeAction}>
                  <input
                    type="hidden"
                    name="organizationId"
                    value={organizationId}
                  />
                  <input type="hidden" name="orgSlug" value={orgSlug} />
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button
                    type="submit"
                    className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium"
                  >
                    {labels.closeSession}
                  </button>
                </form>
              ) : null}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.colSession}</TableHead>
                  <TableHead>{labels.colSchedule}</TableHead>
                  <TableHead>{labels.colRoster}</TableHead>
                  <TableHead>{labels.colState}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={2}>
                    {formatDateTime(session.scheduledStartAt)} —{" "}
                    {formatDateTime(session.scheduledEndAt)}
                  </TableCell>
                  <TableCell>{roster.length}</TableCell>
                  <TableCell>{session.state}</TableCell>
                  <TableCell />
                </TableRow>
                {roster.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell colSpan={2}>
                      {row.employeeNumber} — {row.employeeName}
                    </TableCell>
                    <TableCell>{row.attendance ?? "—"}</TableCell>
                    <TableCell>{row.state}</TableCell>
                    <TableCell>
                      {open ? (
                        <form action={attendanceAction} className="inline">
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
                            name="attendance"
                            value="present"
                          />
                          <button
                            type="submit"
                            className="text-xs text-primary hover:underline"
                          >
                            {labels.markPresent}
                          </button>
                        </form>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {open ? (
              <form action={assignAction} className="mt-3 flex flex-wrap gap-2">
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="courseId" value={session.courseId} />
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="sourceKind" value="session_roster" />
                <select
                  name="employeeId"
                  required
                  className="flex h-8 min-w-[12rem] rounded-md border border-input bg-background px-2 text-sm"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeNumber} — {e.legalName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                >
                  {labels.assignToSession}
                </button>
              </form>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
