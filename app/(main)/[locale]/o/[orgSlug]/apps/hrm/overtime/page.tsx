import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { OvertimePage, resolveOtmSurfaceAccess } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getOrgTenantContext } from "#lib/auth"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

type PageProps = {
  params: Promise<{ locale: string; orgSlug: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmOvertimePage({ params }: PageProps) {
  const { locale, orgSlug } = await params
  ensureAppLocale(locale)

  const session = await getOrgTenantContext()
  const access = await resolveOtmSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })

  const t = await getTranslations("Dashboard.Hrm.overtime")

  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  return (
    <OvertimePage
      orgSlug={orgSlug}
      access={access}
      organizationId={session.organizationId}
      userId={session.userId}
    />
  )
}
