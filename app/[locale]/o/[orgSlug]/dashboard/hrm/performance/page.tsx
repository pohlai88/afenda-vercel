import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { HrmPerformancePage } from "#features/hrm"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.performance")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgDashboardHrmPerformancePage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { orgSlug } = await params
  return <HrmPerformancePage orgSlug={orgSlug} />
}
