import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"
import { buildWorkforceListSurfaceConfiguration } from "#features/hrm/server"

import {
  DEMO_WORKFORCE_ORG_SLUG,
  getDemoWorkforceFixture,
} from "../data/demo-workforce.fixture.server"

export async function DemoEmployeeRecordsReadOnlySurface() {
  const rows = getDemoWorkforceFixture()
  const t = await getTranslations("Dashboard.Hrm.workforce")

  const listConfiguration = buildWorkforceListSurfaceConfiguration(
    rows,
    DEMO_WORKFORCE_ORG_SLUG,
    {
      empty: t("empty"),
      colNumber: t("colNumber"),
      colName: t("colName"),
      colEmail: t("colEmail"),
      colStatus: t("colStatus"),
      statusActive: t("statusActive"),
      statusArchived: t("statusArchived"),
    }
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("pageTitle")}
        </p>
        <h2 className="text-2xl font-semibold tracking-normal">
          {t("pageTitle")}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("pageDescription")}
        </p>
      </header>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("pageTitle")}</CardTitle>
          <CardDescription>{t("pageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={listConfiguration}
            surfaceKey="demo:hrm:workforce:employees"
            resolveConfiguredPermission={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
