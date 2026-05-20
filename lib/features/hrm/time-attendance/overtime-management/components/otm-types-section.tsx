import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { buildOtmTypesListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import type { OtmTypeChoiceRow } from "../data/otm.types.shared"
import type { HrmOtmDayCategory } from "../schemas/otm.schema"
import { OtmCreateTypeDialog } from "./otm-create-type-dialog"
import { OtmSeedTypesButton } from "./otm-seed-types-button"

export async function OtmTypesSection({
  types,
  canManage,
}: {
  types: readonly OtmTypeChoiceRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")

  if (types.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("noTypesTitle")}</CardTitle>
          <CardDescription>{t("noTypesBody")}</CardDescription>
        </CardHeader>
        {canManage ? (
          <CardContent className="flex flex-wrap gap-2">
            <OtmSeedTypesButton />
            <OtmCreateTypeDialog />
          </CardContent>
        ) : null}
      </Card>
    )
  }

  return (
    <GovernedPatternCListSection
      title={t("typesTitle")}
      description={t("typesDescription")}
      surfaceKey={OTM_LIST_SURFACE_IDS.types}
      listConfiguration={buildOtmTypesListSurfaceConfiguration(types, {
        empty: t("typesEmpty"),
        colCode: t("colTypeCode"),
        colLabel: t("colTypeLabel"),
        colDayCategory: t("colDayCategory"),
        dayCategoryLabelFor: (category) =>
          t(`dayCategoryLabels.${category as HrmOtmDayCategory}`),
      })}
      headerSlot={
        canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <OtmSeedTypesButton />
            <OtmCreateTypeDialog />
          </div>
        ) : undefined
      }
    />
  )
}
