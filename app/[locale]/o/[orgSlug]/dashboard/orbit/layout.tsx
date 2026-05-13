import type { ReactNode } from "react"

import { getTranslations } from "next-intl/server"

import { WorkbenchCommandLayer } from "#components/workbench"
import { organizationOrbitPath } from "#features/planner"

export default async function OrgDashboardOrbitLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
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
                label: "Blocked execution",
                href: `${organizationOrbitPath(orgSlug)}?lifecycle=blocked`,
                description: "Focus the active queue on blocked work.",
              },
              {
                label: "Automation attention",
                href: `${organizationOrbitPath(orgSlug, "triage")}?automationState=attention`,
                description:
                  "Review reminder and recurrence failures awaiting intervention.",
              },
              {
                label: "Signals awaiting triage",
                href: organizationOrbitPath(orgSlug, "triage"),
                description:
                  "Capture, suppress, or promote operational signals.",
              },
            ],
          },
        ]}
      />
    </>
  )
}
