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
  listShiftSwapRequestsForEmployee,
  listSwapAssignmentChoicesForEmployee,
} from "../data/sft-swap.queries.server"
import { buildSftMySwapsListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import { SftSubmitSwapForm } from "./sft-authoring-forms.client"

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

  let rows: Awaited<ReturnType<typeof listShiftSwapRequestsForEmployee>>
  let choices: Awaited<ReturnType<typeof listSwapAssignmentChoicesForEmployee>>

  try {
    ;[rows, choices] = await Promise.all([
      listShiftSwapRequestsForEmployee({ organizationId, employeeId }),
      listSwapAssignmentChoicesForEmployee({
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
            listConfiguration={{
              dataNature: "table",
              surface: {
                header: { title: SFT_LIST_SURFACE_IDS.mySwaps },
                columnsId: SFT_LIST_SURFACE_IDS.mySwaps,
                rowKey: "id",
                empty: { variant: "muted", title: t("mySwapsEmpty") },
              },
              columns: [{ id: "state", header: t("sftColStatus") }],
              rows: [],
            }}
            surfaceKey="hrm:shift-scheduling:my-swaps:error"
            resolveConfiguredPermission={false}
            loadError={{ variant: "error", title: t("mySwapsLoadFailed") }}
          />
        </CardContent>
      </Card>
    )
  }

  const listConfiguration = buildSftMySwapsListSurfaceConfiguration(rows, {
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
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("mySwapsTitle")}</CardTitle>
        <CardDescription>{t("mySwapsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
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
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.mySwaps}
          resolveConfiguredPermission={false}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.mySwaps}`}
        />
      </CardContent>
    </Card>
  )
}
