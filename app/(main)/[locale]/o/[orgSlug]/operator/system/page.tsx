import { getTranslations } from "next-intl/server"

import {
  GovernedSection,
  GovernedSurface,
  parsePageHeaderData,
} from "#features/governed-surface"
import { organizationOperatorPath } from "#features/platform-admin"
import { requireGlobalAdminSession } from "#lib/auth"

export default async function OrganizationPlatformAdminSystemPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  await requireGlobalAdminSession()
  const { orgSlug } = await params

  const t = await getTranslations("PlatformAdmin.system")

  const headerParsed = parsePageHeaderData({
    eyebrow: t("eyebrow"),
    title: t("title"),
    description: t("description"),
    backHref: organizationOperatorPath(orgSlug),
    backLabel: t("backToOperator"),
  })
  if (!headerParsed.success) {
    throw new Error(
      "OrganizationPlatformAdminSystemPage: invalid governed page header payload"
    )
  }

  return (
    <div className="p-6">
      <GovernedSurface header={headerParsed.data}>
        <GovernedSection title={t("cardTitle")}>
          <p className="text-sm text-muted-foreground">{t("cardBody")}</p>
        </GovernedSection>
      </GovernedSurface>
    </div>
  )
}
