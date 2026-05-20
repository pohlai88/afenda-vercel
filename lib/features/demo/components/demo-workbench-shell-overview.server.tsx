import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

const SHELL_REGION_KEYS = [
  "shellRegionUtility",
  "shellRegionRail",
  "shellRegionCommand",
  "shellRegionMain",
] as const

export async function DemoWorkbenchShellOverview() {
  const t = await getTranslations("Demo")
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("workbenchEyebrow")}
        </p>
        <h2 className="text-2xl font-semibold tracking-normal">
          {t("workbenchPageTitle")}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("workbenchShellPageDescription")}
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {SHELL_REGION_KEYS.map((key) => (
          <li key={key}>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">{t(`${key}Title`)}</CardTitle>
                <CardDescription>{t(`${key}Description`)}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>

      {isDevelopment ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("shellPreviewTitle")}
            </CardTitle>
            <CardDescription>{t("shellPreviewDescriptionDev")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/playground/shell-preview"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              prefetch={false}
            >
              {t("shellPreviewLink")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("shellPreviewTitle")}
            </CardTitle>
            <CardDescription>
              {t("shellPreviewDescriptionProd")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
