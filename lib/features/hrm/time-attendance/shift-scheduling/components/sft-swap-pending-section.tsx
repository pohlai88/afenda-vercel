import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../data/sft-embedded-list-surface-error.server"
import { buildSftSwapPendingListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import { listPendingShiftSwapRequests } from "../data/sft-swap.queries.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import { SftSwapDecisionForms } from "./sft-swap-decision-form.client"

export async function SftSwapPendingSection({
  organizationId,
  canManage,
}: {
  organizationId: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  const format = await getFormatter()

  if (!canManage) {
    return null
  }

  let rows: Awaited<ReturnType<typeof listPendingShiftSwapRequests>>
  try {
    rows = await listPendingShiftSwapRequests(organizationId)
  } catch (err) {
    logUnexpectedServerError("sft-swap-pending: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("swapPendingTitle")}</CardTitle>
          <CardDescription>{t("swapPendingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.swapPending,
              emptyTitle: t("swapPendingEmpty"),
              firstColumn: { id: "requester", header: t("colRequester") },
            })}
            surfaceKey="hrm:shift-scheduling:swap-pending:error"
            resolveConfiguredPermission={false}
            loadError={{ variant: "error", title: t("swapPendingLoadFailed") }}
          />
        </CardContent>
      </Card>
    )
  }

  const listConfiguration = buildSftSwapPendingListSurfaceConfiguration(rows, {
    empty: t("swapPendingEmpty"),
    colRequester: t("colRequester"),
    colCounterparty: t("colCounterparty"),
    colDates: t("colDates"),
    colShifts: t("colShifts"),
    colReason: t("colReason"),
    colRequested: t("colRequested"),
    actionLabel: t("swapDecideAction"),
    formatRequestedAt: (date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("swapPendingTitle")}</CardTitle>
        <CardDescription>{t("swapPendingDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.swapPending}
          invalid={{
            variant: "error",
            title: t("swapPendingLoadFailed"),
          }}
          trailingColumn={{
            header: t("colActions"),
            render: (surfaceRow) => {
              if (
                !isListSurfaceTrailingActionRenderable(
                  surfaceRow.trailingAction
                )
              ) {
                return null
              }
              const swapRequestId = surfaceRow.id
              return (
                <GovernedTrailingActionSlot
                  trailingAction={surfaceRow.trailingAction}
                >
                  <SftSwapDecisionForms swapRequestId={swapRequestId} />
                </GovernedTrailingActionSlot>
              )
            },
          }}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.swapPending}`}
        />
      </CardContent>
    </Card>
  )
}
