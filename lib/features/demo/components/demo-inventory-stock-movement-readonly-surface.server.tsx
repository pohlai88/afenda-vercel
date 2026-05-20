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
  buildDemoStockMovementListConfiguration,
  getDemoStockMovementFixture,
} from "../data/demo-inventory-movement.fixture.server"

export async function DemoInventoryStockMovementReadOnlySurface() {
  const rows = getDemoStockMovementFixture()
  const t = await getTranslations("Demo")

  const listConfiguration = buildDemoStockMovementListConfiguration(rows, {
    empty: t("inventoryListEmpty"),
  })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("inventoryEyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-normal">
          {t("inventoryPageTitle")}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("inventoryMovementPageDescription")}
        </p>
      </header>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("inventoryListTitle")}</CardTitle>
          <CardDescription>{t("inventoryListDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={listConfiguration}
            surfaceKey="demo:inventory:stock-movements"
            resolveConfiguredPermission={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
