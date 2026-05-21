import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../data/otm-embedded-list-surface-error.server"
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

  let rows: Awaited<ReturnType<typeof listOtmRateRulesForOrg>>
  try {
    rows = await listOtmRateRulesForOrg(organizationId)
  } catch (err) {
    logUnexpectedServerError("otm-rate-rules: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("rateRulesTitle")}</CardTitle>
          <CardDescription>{t("rateRulesDescription")}</CardDescription>
        </CardHeader>
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          description=""
          surfaceKey="hrm:overtime:rate-rules:error"
          listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
            columnsId: OTM_LIST_SURFACE_IDS.rateRules,
            emptyTitle: t("rateRulesEmpty"),
            firstColumn: { id: "type", header: t("colType") },
          })}
          resolveConfiguredPermission={false}
          loadError={{
            variant: "error",
            title: t("rateRulesLoadFailed"),
          }}
        />
      </Card>
    )
  }

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
        invalid={{
          variant: "error",
          title: t("rateRulesLoadFailed"),
        }}
      />
    </Card>
  )
}
