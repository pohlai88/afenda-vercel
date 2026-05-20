import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listShiftAvailabilityForOrg } from "../data/sft-availability.queries.server"
import { listPendingScheduleChangeRequests } from "../data/sft-schedule-change.server"
import { listAllShiftTemplatesForOrg } from "../data/sft-template.queries.server"
import { SftAvailabilityWeekCalendar } from "./sft-availability-week-calendar.client"
import {
  SftAvailabilityCreateForm,
  SftHolidayPlannerForm,
  SftRestOffPlannerForm,
  SftScheduleChangeDecisionForms,
} from "./sft-workflow-forms.client"

export async function SftAvailabilitySection({
  organizationId,
  rangeStart,
  rangeEnd,
  canManage,
}: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  const rows = await listShiftAvailabilityForOrg({
    organizationId,
    rangeStart,
    rangeEnd,
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("availabilityTitle")}</CardTitle>
        <CardDescription>{t("availabilityDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SftAvailabilityWeekCalendar
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          entries={rows}
        />
        {canManage ? (
          <SftAvailabilityCreateForm defaultDate={rangeStart} />
        ) : null}
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={{
            dataNature: "table",
            surface: {
              header: { title: "hrm:shift-scheduling:availability" },
              columnsId: "hrm:shift-scheduling:availability",
              rowKey: "id",
              empty: { variant: "muted", title: t("availabilityEmpty") },
            },
            columns: [
              { id: "employee", header: t("colEmployee") },
              { id: "date", header: t("colDate") },
              { id: "kind", header: t("colKind") },
              { id: "reason", header: t("colReason") },
            ],
            rows: rows.map((row) => ({
              id: row.id,
              cells: {
                employee: row.employeeId,
                date: row.attendanceDate,
                kind: row.kind,
                reason: row.reason ?? "—",
              },
            })),
          }}
          surfaceKey="hrm:shift-scheduling:availability"
          resolveConfiguredPermission={false}
        />
      </CardContent>
    </Card>
  )
}

export async function SftRestOffPlannerSection({
  organizationId,
  rangeStart,
  rangeEnd,
  canManage,
}: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  if (!canManage) return null

  const templates = await listAllShiftTemplatesForOrg(organizationId)
  const restOffTemplates = templates.filter(
    (row) => row.shiftCategory === "rest" || row.shiftCategory === "off"
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("restOffPlannerTitle")}</CardTitle>
        <CardDescription>{t("restOffPlannerDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SftRestOffPlannerForm
          templates={restOffTemplates.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
          }))}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </CardContent>
    </Card>
  )
}

export async function SftHolidayPlannerSection({
  organizationId,
  rangeStart,
  rangeEnd,
  canManage,
}: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  if (!canManage) return null

  const templates = await listAllShiftTemplatesForOrg(organizationId)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("holidayPlannerTitle")}</CardTitle>
        <CardDescription>{t("holidayPlannerDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SftHolidayPlannerForm
          templates={templates.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
          }))}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </CardContent>
    </Card>
  )
}

export async function SftScheduleChangePendingSection({
  organizationId,
  canManage,
}: {
  organizationId: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  if (!canManage) return null

  const rows = await listPendingScheduleChangeRequests({ organizationId })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("scheduleChangePendingTitle")}</CardTitle>
        <CardDescription>
          {t("scheduleChangePendingDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={{
            dataNature: "table",
            surface: {
              header: { title: "hrm:shift-scheduling:schedule-change-pending" },
              columnsId: "hrm:shift-scheduling:schedule-change-pending",
              rowKey: "id",
              empty: {
                variant: "muted",
                title: t("scheduleChangePendingEmpty"),
              },
            },
            columns: [
              { id: "employee", header: t("colEmployee") },
              { id: "date", header: t("colDate") },
              { id: "shift", header: t("colShift") },
              { id: "reason", header: t("colReason") },
            ],
            rows: rows.map((row) => ({
              id: row.id,
              cells: {
                employee: row.requesterName ?? row.requesterEmployeeId,
                date: row.proposedDate,
                shift: row.proposedTemplateCode,
                reason: row.reason,
              },
            })),
          }}
          surfaceKey="hrm:shift-scheduling:schedule-change-pending"
          resolveConfiguredPermission={false}
        />
        {rows.length > 0 ? (
          <SftScheduleChangeDecisionForms
            requests={rows.map((row) => ({
              id: row.id,
              label: `${row.requesterName ?? row.requesterEmployeeId} · ${row.proposedDate}`,
            }))}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
