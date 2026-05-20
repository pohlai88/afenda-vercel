import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildOtmRateRulesListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmRateRulesForOrg } from "../data/otm-rate.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import type { OtmTypeChoiceRow } from "../data/otm.types.shared"
import { OtmCreateRateDialog } from "./otm-create-rate-dialog.client"

export async function OtmRateRulesSection({
  organizationId,
  overtimeTypes,
  canManage,
}: {
  organizationId: string
  overtimeTypes: OtmTypeChoiceRow[]
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const rows = await listOtmRateRulesForOrg(organizationId)

  const listConfiguration = buildOtmRateRulesListSurfaceConfiguration(rows, {
    empty: t("rateRulesEmpty"),
    colType: t("colType"),
    colMultiplier: t("colMultiplier"),
    colCountry: t("colCountry"),
    colWorker: t("colWorker"),
    colEarning: t("colEarning"),
    colEffective: t("colEffective"),
    anyLabel: t("anyCriteria"),
    formatEffective: (row) => {
      if (row.effectiveFrom && row.effectiveTo) {
        return `${row.effectiveFrom} – ${row.effectiveTo}`
      }
      if (row.effectiveFrom) return `${t("effectiveFrom")} ${row.effectiveFrom}`
      if (row.effectiveTo) return `${t("effectiveTo")} ${row.effectiveTo}`
      return t("anyCriteria")
    },
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("rateRulesTitle")}</CardTitle>
        <CardDescription>{t("rateRulesDescription")}</CardDescription>
        {canManage && overtimeTypes.length > 0 ? (
          <CardAction>
            <OtmCreateRateDialog overtimeTypes={overtimeTypes} />
          </CardAction>
        ) : null}
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey={OTM_LIST_SURFACE_IDS.rateRules}
        listConfiguration={listConfiguration}
      />
    </Card>
  )
}
