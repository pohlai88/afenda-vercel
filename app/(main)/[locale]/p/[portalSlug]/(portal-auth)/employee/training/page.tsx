import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { EmployeePortalTrainingPage } from "#features/hrm"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.training")
  return {
    title: t("portalMetaTitle"),
    description: t("portalMetaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function PortalEmployeeTrainingPage({
  params,
}: {
  params: Promise<{ locale: string; portalSlug: string }>
}) {
  const { portalSlug } = await params
  return <EmployeePortalTrainingPage portalSlug={portalSlug} />
}
