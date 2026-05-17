import type { Route } from "next"

import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import {
  OrganizationSlugSettingsForm,
  organizationAdminPath,
} from "#features/org-admin"
import { recordOrgAdminPageVisit } from "#features/org-admin/server"
import { GovernedSurface } from "#features/governed-surface"

import { Link } from "#i18n/navigation"
import { requireOrgSession } from "#lib/auth"

export default async function OrgAdminSettingsPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/admin/settings">) {
  const { orgSlug } = await params
  const t = await getTranslations("OrgAdmin.settings")
  const orgSession = await requireOrgSession()

  // Working Memory Rail — record this page in the operator's recents.
  await recordOrgAdminPageVisit({
    orgSession,
    orgSlug,
    segment: "settings",
  })

  return (
    <GovernedSurface
      header={{
        title: t("title"),
        description: t("description"),
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("accountSecurityTitle")}
            </CardTitle>
            <CardDescription>{t("accountSecurityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link
              href={"/account/security" as Route}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("securityCenter")}
            </Link>
            <Link
              href={"/account/identity" as Route}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("identity")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("orgProfileTitle")}</CardTitle>
            <CardDescription>{t("orgProfileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{t("orgProfileHint")}</p>
            <OrganizationSlugSettingsForm orgSlug={orgSlug} />
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link
          href={organizationAdminPath(orgSlug, "overview")}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backAdmin")}
        </Link>
      </p>
    </GovernedSurface>
  )
}
