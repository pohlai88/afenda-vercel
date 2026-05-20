import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import {
  buildDemoPurchaseRequestListConfiguration,
  getDemoPurchaseRequestFixture,
} from "../data/demo-procurement-pr.fixture.server"

export async function DemoProcurementPurchaseRequestReadOnlySurface() {
  const rows = getDemoPurchaseRequestFixture()
  const t = await getTranslations("Demo")

  const listConfiguration = buildDemoPurchaseRequestListConfiguration(rows, {
    empty: t("procurementListEmpty"),
  })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("procurementEyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-normal">
          {t("procurementPageTitle")}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("procurementPrPageDescription")}
        </p>
      </header>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("procurementListTitle")}
          </CardTitle>
          <CardDescription>{t("procurementListDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={listConfiguration}
            surfaceKey="demo:procurement:purchase-requests"
            resolveConfiguredPermission={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
