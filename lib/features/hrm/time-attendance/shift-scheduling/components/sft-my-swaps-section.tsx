import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import {
  listScheduleChangeChoicesForEmployee,
  listScheduleChangeRequestsForEmployee,
} from "../data/sft-schedule-change.server"
import {
  listShiftSwapRequestsForEmployee,
  listSwapAssignmentChoicesForEmployee,
} from "../data/sft-swap.queries.server"
import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../data/sft-embedded-list-surface-error.server"
import {
  buildSftMyScheduleChangesListSurfaceConfiguration,
  buildSftMySwapsListSurfaceConfiguration,
} from "../data/sft-surface-builders.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import {
  SftSubmitScheduleChangeForm,
  SftSubmitSwapForm,
} from "./sft-authoring-forms.client"

export async function SftMySwapsSection({
  organizationId,
  employeeId,
  rangeStart,
  rangeEnd,
}: {
  organizationId: string
  employeeId: string
  rangeStart: string
  rangeEnd: string
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  const format = await getFormatter()

  let swapRows: Awaited<ReturnType<typeof listShiftSwapRequestsForEmployee>>
  let scheduleChangeRows: Awaited<
    ReturnType<typeof listScheduleChangeRequestsForEmployee>
  >
  let choices: Awaited<ReturnType<typeof listSwapAssignmentChoicesForEmployee>>
  let scheduleChoices: Awaited<
    ReturnType<typeof listScheduleChangeChoicesForEmployee>
  >

  try {
    ;[swapRows, scheduleChangeRows, choices, scheduleChoices] =
      await Promise.all([
        listShiftSwapRequestsForEmployee({ organizationId, employeeId }),
        listScheduleChangeRequestsForEmployee({ organizationId, employeeId }),
        listSwapAssignmentChoicesForEmployee({
          organizationId,
          employeeId,
          rangeStart,
          rangeEnd,
        }),
        listScheduleChangeChoicesForEmployee({
          organizationId,
          employeeId,
          rangeStart,
          rangeEnd,
        }),
      ])
  } catch (err) {
    logUnexpectedServerError("sft-my-swaps-section: query failed", err, {
      organizationId,
      employeeId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("mySwapsTitle")}</CardTitle>
          <CardDescription>{t("mySwapsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.mySwaps,
              emptyTitle: t("mySwapsEmpty"),
              firstColumn: { id: "state", header: t("sftColStatus") },
            })}
            surfaceKey="hrm:shift-scheduling:my-swaps:error"
            resolveConfiguredPermission={false}
            loadError={{ variant: "error", title: t("mySwapsLoadFailed") }}
          />
        </CardContent>
      </Card>
    )
  }

  const swapListConfiguration = buildSftMySwapsListSurfaceConfiguration(
    swapRows,
    {
      empty: t("mySwapsEmpty"),
      colRole: t("colSwapRole"),
      colDates: t("colDates"),
      colShifts: t("colShifts"),
      colState: t("sftColStatus"),
      colReason: t("colReason"),
      colRequested: t("colRequested"),
      roleLabel: (isRequester) =>
        isRequester ? t("swapRoleRequester") : t("swapRoleCounterparty"),
      formatRequestedAt: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    }
  )

  const scheduleChangeListConfiguration =
    buildSftMyScheduleChangesListSurfaceConfiguration(scheduleChangeRows, {
      empty: t("scheduleChangeMyEmpty"),
      colDate: t("colDate"),
      colShift: t("colShift"),
      colState: t("sftColStatus"),
      colReason: t("colReason"),
      colRequested: t("colRequested"),
      formatRequestedAt: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("mySwapsTitle")}</CardTitle>
        <CardDescription>{t("mySwapsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="rounded-md border border-border p-4">
          <h4 className="text-sm font-medium">
            {t("scheduleChangeSubmitTitle")}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("scheduleChangeSubmitDescription")}
          </p>
          <div className="mt-4">
            <SftSubmitScheduleChangeForm
              assignmentChoices={scheduleChoices.assignments}
              templateChoices={scheduleChoices.templates}
              defaultDate={rangeStart}
            />
          </div>
        </div>
        <GovernedPatternCListSection
          layout="embedded"
          title={t("scheduleChangeMyTitle")}
          listConfiguration={scheduleChangeListConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.myScheduleChanges}
          resolveConfiguredPermission={false}
          invalid={{
            variant: "error",
            title: t("mySwapsLoadFailed"),
          }}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.myScheduleChanges}`}
        />
        <div className="rounded-md border border-border p-4">
          <h4 className="text-sm font-medium">{t("swapSubmitTitle")}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("swapSubmitDescription")}
          </p>
          <div className="mt-4">
            <SftSubmitSwapForm
              requesterChoices={choices.requester}
              counterpartyChoices={choices.counterparty}
            />
          </div>
        </div>
        <GovernedPatternCListSection
          layout="embedded"
          title={t("swapMyRequestsTitle")}
          listConfiguration={swapListConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.mySwaps}
          resolveConfiguredPermission={false}
          invalid={{
            variant: "error",
            title: t("mySwapsLoadFailed"),
          }}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.mySwaps}`}
        />
      </CardContent>
    </Card>
  )
}
