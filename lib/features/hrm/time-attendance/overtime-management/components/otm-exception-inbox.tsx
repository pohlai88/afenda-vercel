import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../data/otm-embedded-list-surface-error.server"
import { buildOtmExceptionInboxListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { formatOvertimeDurationMinutes } from "../data/otm-display.shared"
import { listPendingOtmExceptionsForOrg } from "../data/otm-exception.server"
import { getOtmExceptionTypeLabelMap } from "../data/otm-section-labels.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import { OtmExceptionDecisionForms } from "./otm-exception-decision-form"

export async function OtmExceptionInbox({
  organizationId,
}: {
  organizationId: string
}) {
  const [t, exceptionTypeLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.overtime"),
    getOtmExceptionTypeLabelMap(),
  ])

  let rows: Awaited<ReturnType<typeof listPendingOtmExceptionsForOrg>>
  try {
    rows = await listPendingOtmExceptionsForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("otm-exception-inbox: query failed", err, {
      organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title={t("exceptionInboxTitle")}
        listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
          columnsId: OTM_LIST_SURFACE_IDS.exceptionInbox,
          emptyTitle: t("exceptionInboxEmpty"),
          firstColumn: { id: "employee", header: t("colEmployee") },
        })}
        surfaceKey="hrm:overtime:exception-inbox:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("exceptionInboxLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildOtmExceptionInboxListSurfaceConfiguration(
    rows,
    {
      empty: t("exceptionInboxEmpty"),
      colEmployee: t("colEmployee"),
      colWorkDate: t("colWorkDate"),
      colType: t("colExceptionType"),
      colJustification: t("colExceptionJustification"),
      colTimeRange: t("colTimeRange"),
      colDuration: t("colDuration"),
      colActions: t("colActions"),
      exceptionTypeLabel: (type) => exceptionTypeLabels[type],
      formatDuration: formatOvertimeDurationMinutes,
      approveLabel: t("exceptionApprove"),
      rejectLabel: t("exceptionReject"),
    }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title={t("exceptionInboxTitle")}
      description={t("exceptionInboxDescription")}
      surfaceKey={OTM_LIST_SURFACE_IDS.exceptionInbox}
      listConfiguration={listConfiguration}
      invalid={{
        variant: "error",
        title: t("exceptionInboxLoadFailed"),
      }}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (
            !row ||
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot
              trailingAction={surfaceRow.trailingAction}
            >
              <OtmExceptionDecisionForms exceptionId={row.id} />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
