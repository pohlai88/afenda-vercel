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

import { PLATFORM_ADMIN_NAV_ITEMS } from "#features/platform-admin"
import { requireGlobalAdminSession } from "#lib/tenant"

export default async function PlatformAdminHomePage() {
  await requireGlobalAdminSession()

  const t = await getTranslations("PlatformAdmin")
  const tCard = await getTranslations("PlatformAdmin.card")

  return (
    <div className="p-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("overviewTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("overviewDescription")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_ADMIN_NAV_ITEMS.map((item) => (
            <Card key={item.capabilityId}>
              <CardHeader>
                <CardTitle className="text-base">
                  {tCard(`${item.navKey}.title`)}
                </CardTitle>
                <CardDescription>
                  {tCard(`${item.navKey}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={item.href as Route}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {tCard(`${item.navKey}.action`)}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
