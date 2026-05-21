import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listShiftAvailabilityForOrg } from "../data/sft-availability.queries.server"
import type { ShiftAvailabilityRow } from "../data/sft-availability.queries.server"
import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../data/sft-embedded-list-surface-error.server"
import {
  buildSftAvailabilityListSurfaceConfiguration,
  buildSftScheduleChangePendingListSurfaceConfiguration,
} from "../data/sft-surface-builders.server"
import { listPendingScheduleChangeRequests } from "../data/sft-schedule-change.server"
import { listAllShiftTemplatesForOrg } from "../data/sft-template.queries.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import { SftAvailabilityWeekCalendar } from "./sft-availability-week-calendar.client"
import {
  SftAvailabilityCreateForm,
  SftHolidayPlannerForm,
  SftRestOffPlannerForm,
  SftScheduleChangeDecisionForms,
} from "./sft-workflow-forms.client"

function availabilityKindLabel(
  kind: ShiftAvailabilityRow["kind"],
  copy: { unavailable: string; preferred: string }
): string {
  return kind === "unavailable" ? copy.unavailable : copy.preferred
}

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

  let rows: Awaited<ReturnType<typeof listShiftAvailabilityForOrg>>
  try {
    rows = await listShiftAvailabilityForOrg({
      organizationId,
      rangeStart,
      rangeEnd,
    })
  } catch (err) {
    logUnexpectedServerError("sft-availability: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("availabilityTitle")}</CardTitle>
          <CardDescription>{t("availabilityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.availability,
              emptyTitle: t("availabilityEmpty"),
              firstColumn: { id: "employee", header: t("colEmployee") },
            })}
            surfaceKey="hrm:shift-scheduling:availability:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("availabilityLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const kindLabels = {
    unavailable: t("availabilityKindUnavailable"),
    preferred: t("availabilityKindPreferred"),
  }

  const listConfiguration = buildSftAvailabilityListSurfaceConfiguration(
    rows,
    {
      empty: t("availabilityEmpty"),
      colEmployee: t("colEmployee"),
      colDate: t("colDate"),
      colKind: t("colKind"),
      colReason: t("colReason"),
      kindLabel: (kind) => availabilityKindLabel(kind, kindLabels),
    }
  )

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
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.availability}
          resolveConfiguredPermission={false}
          invalid={{
            variant: "error",
            title: t("availabilityLoadFailed"),
          }}
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

  let templates: Awaited<ReturnType<typeof listAllShiftTemplatesForOrg>>
  try {
    templates = await listAllShiftTemplatesForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("sft-rest-off-planner: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("restOffPlannerTitle")}</CardTitle>
          <CardDescription>{t("restOffPlannerDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{t("templatesLoadFailed")}</p>
        </CardContent>
      </Card>
    )
  }

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

  let templates: Awaited<ReturnType<typeof listAllShiftTemplatesForOrg>>
  try {
    templates = await listAllShiftTemplatesForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("sft-holiday-planner: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("holidayPlannerTitle")}</CardTitle>
          <CardDescription>{t("holidayPlannerDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{t("templatesLoadFailed")}</p>
        </CardContent>
      </Card>
    )
  }

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

  let rows: Awaited<ReturnType<typeof listPendingScheduleChangeRequests>>
  try {
    rows = await listPendingScheduleChangeRequests({ organizationId })
  } catch (err) {
    logUnexpectedServerError("sft-schedule-change-pending: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("scheduleChangePendingTitle")}</CardTitle>
          <CardDescription>
            {t("scheduleChangePendingDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.scheduleChangePending,
              emptyTitle: t("scheduleChangePendingEmpty"),
              firstColumn: { id: "employee", header: t("colEmployee") },
            })}
            surfaceKey="hrm:shift-scheduling:schedule-change-pending:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("scheduleChangePendingLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const listConfiguration =
    buildSftScheduleChangePendingListSurfaceConfiguration(rows, {
      empty: t("scheduleChangePendingEmpty"),
      colEmployee: t("colEmployee"),
      colDate: t("colDate"),
      colShift: t("colShift"),
      colReason: t("colReason"),
    })

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
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.scheduleChangePending}
          resolveConfiguredPermission={false}
          invalid={{
            variant: "error",
            title: t("scheduleChangePendingLoadFailed"),
          }}
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
