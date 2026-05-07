import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { Link } from "#i18n/navigation"

export default async function PlatformAdminHomePage() {
  const t = await getTranslations("PlatformAdmin")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("usersCardTitle")}</CardTitle>
            <CardDescription>{t("usersCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={"/admin/users" as Route}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("openUsers")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
