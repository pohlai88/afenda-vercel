import type { Metadata } from "next"
import { HrmShellAccessDeniedFromNav } from "#features/hrm"
import { getTranslations } from "next-intl/server"

import { HrmKpiPage } from "#features/hrm"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.kpi")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmKpiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orgSlug: string }>
  searchParams?: Promise<{ tab?: string; goalStatus?: string }>
}) {
  const { orgSlug } = await params
  const sp = (await searchParams) ?? {}
  const activeTab = sp.tab === "goals" ? "goals" : "metrics"
  const [allowed, isHrmAdmin] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "kpi",
      function: "search",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "kpi",
      function: "update",
    }),
  ])
  if (!allowed) {
    return <HrmShellAccessDeniedFromNav navKey="kpi" />
  }
  return (
    <HrmKpiPage
      orgSlug={orgSlug}
      activeTab={activeTab}
      goalStatusFilter={sp.goalStatus}
      isHrmAdmin={isHrmAdmin}
    />
  )
}
