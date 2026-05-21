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

import { buildSftEmbeddedListSurfaceErrorConfiguration } from "../data/sft-embedded-list-surface-error.server"
import { buildSftTemplatesListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import { listAllShiftTemplatesForOrg } from "../data/sft-template.queries.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"
import { SftCreateShiftTemplateForm } from "./sft-authoring-forms.client"

export async function SftTemplatesSection({
  organizationId,
  canManage = false,
}: {
  organizationId: string
  canManage?: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  let rows: Awaited<ReturnType<typeof listAllShiftTemplatesForOrg>>
  try {
    rows = await listAllShiftTemplatesForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("sft-templates-section: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("templatesTitle")}</CardTitle>
          <CardDescription>{t("templatesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildSftEmbeddedListSurfaceErrorConfiguration({
              columnsId: SFT_LIST_SURFACE_IDS.templates,
              emptyTitle: t("templatesEmpty"),
              firstColumn: { id: "code", header: t("colCode") },
            })}
            surfaceKey="hrm:shift-scheduling:templates:error"
            resolveConfiguredPermission={false}
            loadError={{ variant: "error", title: t("templatesLoadFailed") }}
          />
        </CardContent>
      </Card>
    )
  }

  const listConfiguration = buildSftTemplatesListSurfaceConfiguration(rows, {
    empty: t("templatesEmpty"),
    colCode: t("colCode"),
    colName: t("colName"),
    colCategory: t("colCategory"),
    colPattern: t("colPattern"),
    colWindow: t("colWindow"),
    colActive: t("colActive"),
    activeLabel: (active) => (active ? t("activeYes") : t("activeNo")),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("templatesTitle")}</CardTitle>
        <CardDescription>{t("templatesDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {canManage ? (
          <div className="rounded-md border border-border p-4">
            <h4 className="text-sm font-medium">{t("templateCreateTitle")}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("templateCreateDescription")}
            </p>
            <div className="mt-4">
              <SftCreateShiftTemplateForm />
            </div>
          </div>
        ) : null}
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.templates}
          invalid={{
            variant: "error",
            title: t("templatesLoadFailed"),
          }}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.templates}`}
        />
      </CardContent>
    </Card>
  )
}
