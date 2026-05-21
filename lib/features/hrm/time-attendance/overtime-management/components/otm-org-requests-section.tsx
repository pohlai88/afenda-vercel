import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../data/otm-embedded-list-surface-error.server"
import { buildOtmOrgRecentListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { getOtmDayCategoryLabelMap } from "../data/otm-section-labels.server"
import { listOtmRequestsForOrg } from "../data/otm.queries.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"

export async function OtmOrgRequestsSection({
  organizationId,
}: {
  organizationId: string
}) {
  const [t, format, dayCategoryLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.overtime"),
    getFormatter(),
    getOtmDayCategoryLabelMap(),
  ])

  let rows: Awaited<ReturnType<typeof listOtmRequestsForOrg>>
  try {
    rows = await listOtmRequestsForOrg(organizationId, {
      states: ["submitted", "approved", "rejected", "returned"],
      limit: 50,
    })
  } catch (err) {
    logUnexpectedServerError("otm-org-requests: query failed", err, {
      organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title={t("recentTitle")}
        description={t("recentDescription")}
        surfaceKey="hrm:overtime:recent:error"
        listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
          columnsId: OTM_LIST_SURFACE_IDS.orgRecent,
          emptyTitle: t("recentEmpty"),
          firstColumn: { id: "employee", header: t("colEmployee") },
        })}
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("recentLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildOtmOrgRecentListSurfaceConfiguration(rows, {
    columnsId: OTM_LIST_SURFACE_IDS.orgRecent,
    empty: t("recentEmpty"),
    colEmployee: t("colEmployee"),
    colWorkDate: t("colWorkDate"),
    colTimeRange: t("colTimeRange"),
    colDuration: t("colDuration"),
    colDayCategory: t("colDayCategory"),
    colState: t("colState"),
    colRequested: t("colRequested"),
    dayCategoryLabels,
    formatRequestedAt: (date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    stateLabelFor: (state) =>
      t(`stateLabels.${state}` as "stateLabels.submitted"),
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title={t("recentTitle")}
      description={t("recentDescription")}
      surfaceKey={OTM_LIST_SURFACE_IDS.orgRecent}
      listConfiguration={listConfiguration}
      invalid={{
        variant: "error",
        title: t("recentLoadFailed"),
      }}
    />
  )
}
