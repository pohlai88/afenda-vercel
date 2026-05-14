import type { ReactNode } from "react"

import { getTranslations } from "next-intl/server"

import { WorkbenchCommandLayer } from "#components/workbench/workbench-command"
import { ErpAccessDenied } from "#features/erp-rbac"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { organizationOrbitPath } from "#features/planner"

export default async function OrgDashboardOrbitLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "planner",
    object: "workspace",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Orbit"
        description="This surface requires an ERP role with Orbit search access."
      />
    )
  }
  const t = await getTranslations("Dashboard.Orbit")

  return (
    <>
      {children}
      <WorkbenchCommandLayer
        title={t("title")}
        description={t("description")}
        sections={[
          {
            heading: t("title"),
            items: [
              {
                label: t("surfaces.queue.label"),
                href: organizationOrbitPath(orgSlug),
                description: t("surfaces.queue.description"),
              },
              {
                label: t("surfaces.triage.label"),
                href: organizationOrbitPath(orgSlug, "triage"),
                description: t("surfaces.triage.description"),
              },
              {
                label: t("surfaces.today.label"),
                href: organizationOrbitPath(orgSlug, "today"),
                description: t("surfaces.today.description"),
              },
              {
                label: t("surfaces.timeline.label"),
                href: organizationOrbitPath(orgSlug, "timeline"),
                description: t("surfaces.timeline.description"),
              },
              {
                label: t("surfaces.signals.label"),
                href: organizationOrbitPath(orgSlug, "signals"),
                description: t("surfaces.signals.description"),
              },
              {
                label: t("surfaces.sessions.label"),
                href: organizationOrbitPath(orgSlug, "sessions"),
                description: t("surfaces.sessions.description"),
              },
              {
                label: t("surfaces.links.label"),
                href: organizationOrbitPath(orgSlug, "links"),
                description: t("surfaces.links.description"),
              },
            ],
          },
          {
            heading: t("eyebrow"),
            items: [
              {
                label: t("commandQuickLinks.blockedExecution.label"),
                href: `${organizationOrbitPath(orgSlug)}?lifecycle=blocked`,
                description: t(
                  "commandQuickLinks.blockedExecution.description"
                ),
              },
              {
                label: t("commandQuickLinks.automationAttention.label"),
                href: `${organizationOrbitPath(orgSlug, "triage")}?automationState=attention`,
                description: t(
                  "commandQuickLinks.automationAttention.description"
                ),
              },
              {
                label: t("commandQuickLinks.signalsAwaitingTriage.label"),
                href: organizationOrbitPath(orgSlug, "triage"),
                description: t(
                  "commandQuickLinks.signalsAwaitingTriage.description"
                ),
              },
            ],
          },
        ]}
      />
    </>
  )
}
