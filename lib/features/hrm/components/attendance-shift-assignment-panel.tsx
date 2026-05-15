import { getTranslations } from "next-intl/server"
import { CalendarClockIcon } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Skeleton } from "#components/ui/skeleton"

import {
  getShiftAssignmentForEmployeeDate,
  listShiftTemplatesForOrg,
  shiftAssignmentRowToView,
  shiftTemplateRowToOption,
} from "../data/attendance-shift.queries.server"

import { AttendanceShiftAssignmentForms } from "./attendance-shift-assignment-forms.client"

type AttendanceShiftAssignmentPanelProps = {
  organizationId: string
  employeeId: string
  attendanceDate: string
}

export async function AttendanceShiftAssignmentPanel({
  organizationId,
  employeeId,
  attendanceDate,
}: AttendanceShiftAssignmentPanelProps) {
  const [t, templates, assignment] = await Promise.all([
    getTranslations("Dashboard.Hrm.attendance"),
    listShiftTemplatesForOrg(organizationId),
    getShiftAssignmentForEmployeeDate({
      organizationId,
      employeeId,
      attendanceDate,
    }),
  ])
  const templateOptions = templates.map(shiftTemplateRowToOption)
  const assignmentView = assignment
    ? shiftAssignmentRowToView(assignment)
    : null

  return (
    <section className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <CalendarClockIcon className="size-4" aria-hidden />
              {t("shiftPanelTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("shiftPanelDescription")}
            </p>
          </div>
          {assignmentView ? (
            <Badge variant="info">
              {assignmentView.templateCode} · {assignmentView.templateName}
            </Badge>
          ) : (
            <Badge variant="outline">{t("shiftUnassignedLabel")}</Badge>
          )}
        </div>

        {assignmentView ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <ShiftFact
              label={t("shiftWindowLabel")}
              value={`${formatDateTime(assignmentView.scheduledStartAt)} - ${formatDateTime(
                assignmentView.scheduledEndAt
              )}`}
            />
            <ShiftFact
              label={t("shiftBreakLabel")}
              value={t("shiftBreakValue", {
                unpaid: assignmentView.unpaidBreakMinutes,
                paid: assignmentView.paidBreakMinutes,
              })}
            />
            <ShiftFact
              label={t("shiftGraceLabel")}
              value={t("shiftGraceValue", {
                late: assignmentView.lateGraceMinutes,
                early: assignmentView.earlyOutGraceMinutes,
                overtime: assignmentView.overtimeGraceMinutes,
              })}
            />
          </dl>
        ) : null}

        <AttendanceShiftAssignmentForms
          employeeId={employeeId}
          attendanceDate={attendanceDate}
          templates={templateOptions}
          assignment={assignmentView}
        />
      </div>
    </section>
  )
}

export function AttendanceShiftAssignmentPanelSkeleton() {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-10 w-40" />
      </div>
    </section>
  )
}

function ShiftFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  )
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
