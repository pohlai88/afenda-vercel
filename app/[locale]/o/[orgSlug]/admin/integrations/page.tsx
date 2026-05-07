import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

import { organizationAdminPath } from "#features/org-admin"

import { Link } from "#i18n/navigation"

export default async function OrgAdminIntegrationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const t = await getTranslations("OrgAdmin.integrations")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{t("webhooksTitle")}</CardTitle>
            <CardDescription>{t("webhooksDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("webhooksSoon")}</p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{t("importTitle")}</CardTitle>
            <CardDescription>{t("importDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("importSoon")}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link
          href={organizationAdminPath(orgSlug, "overview") as Route}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backAdmin")}
        </Link>
      </p>
    </div>
  )
}
