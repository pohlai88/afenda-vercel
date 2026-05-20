import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { HRM_OTM_DAY_CATEGORIES } from "../schemas/otm.schema"
import { buildOtmOrgRecentListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmRequestsForOrg } from "../data/otm.queries.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import type { HrmOtmDayCategory } from "../schemas/otm.schema"

export async function OtmOrgRequestsSection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const format = await getFormatter()

  const dayCategoryLabels = Object.fromEntries(
    HRM_OTM_DAY_CATEGORIES.map((category) => [
      category,
      t(`dayCategoryLabels.${category}` as `dayCategoryLabels.${HrmOtmDayCategory}`),
    ])
  ) as Record<HrmOtmDayCategory, string>

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
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: OTM_LIST_SURFACE_IDS.orgRecent },
            columnsId: OTM_LIST_SURFACE_IDS.orgRecent,
            rowKey: "id",
            empty: { variant: "muted", title: t("recentEmpty") },
          },
          columns: [{ id: "employee", header: t("colEmployee") }],
          rows: [],
        }}
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
      surfaceKey="hrm:overtime:recent"
      listConfiguration={listConfiguration}
    />
  )
}
