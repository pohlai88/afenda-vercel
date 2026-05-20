import { getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  buildFwaKpiStatConfiguration,
  FWA_STAT_SURFACE_KEY,
} from "../data/fwa-surface-builders.server"
import type {
  FwaListLoadError,
  FwaOrgSummaryCounts,
} from "../data/fwa.types.shared"

export async function FwaKpiSummarySection({
  summary,
  loadError,
}: {
  summary: FwaOrgSummaryCounts
  loadError?: FwaListLoadError
}) {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")

  if (loadError) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("kpiTitle")}</CardTitle>
          <CardDescription>
            {loadError.description ?? loadError.title}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const configuration = buildFwaKpiStatConfiguration(summary, {
    pending: t("kpiPending"),
    active: t("kpiActive"),
    types: t("kpiTypes"),
    expiring: t("kpiExpiring"),
    complianceGap: t("kpiComplianceGap"),
  })

  return (
    <Card
      size="sm"
      data-testid={`governed-stat-section:${FWA_STAT_SURFACE_KEY}`}
    >
      <CardHeader>
        <CardTitle>{t("kpiTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <GovernedComponentRenderer
          component={{
            type: "governed:stat-card",
            serverType: "governed:stat-card",
            configuration,
          }}
        />
      </CardContent>
    </Card>
  )
}
