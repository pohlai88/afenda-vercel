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

import { listRosterPublicationsForOrg } from "../data/sft-publication.queries.server"
import { buildSftPublicationsListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"

export async function SftPublicationsSection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  const format = await getFormatter()

  let rows: Awaited<ReturnType<typeof listRosterPublicationsForOrg>>
  try {
    rows = await listRosterPublicationsForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("sft-publications-section: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("publicationsTitle")}</CardTitle>
          <CardDescription>{t("publicationsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={{
              dataNature: "table",
              surface: {
                header: { title: SFT_LIST_SURFACE_IDS.publications },
                columnsId: SFT_LIST_SURFACE_IDS.publications,
                rowKey: "id",
                empty: { variant: "muted", title: t("publicationsEmpty") },
              },
              columns: [{ id: "period", header: t("colPeriod") }],
              rows: [],
            }}
            surfaceKey="hrm:shift-scheduling:publications:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("publicationsLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const listConfiguration = buildSftPublicationsListSurfaceConfiguration(rows, {
    empty: t("publicationsEmpty"),
    colPeriod: t("colPeriod"),
    colPublished: t("colPublished"),
    colNote: t("sftColNote"),
    formatPublishedAt: (date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("publicationsTitle")}</CardTitle>
        <CardDescription>{t("publicationsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.publications}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.publications}`}
        />
      </CardContent>
    </Card>
  )
}
