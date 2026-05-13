import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#components/workbench"
import { WorkbenchRailFooter } from "#components/workbench/left-nav-rail"
import { organizationNexusPath } from "#features/nexus"
import { organizationOrbitPath } from "#features/planner"
import { organizationAccountPath } from "#lib/dashboard-module-paths"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import type { OrgSession } from "#lib/tenant"

import { buildAccountRailSlotsV2 } from "../../../../(iam)/account/_components/account-rail-slots"
import { getAccountShellData } from "../../../../(iam)/account/_components/account-shell-data.server"

export type OrgAccountDeferredWorkbenchProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  orgSession: OrgSession
}

/**
 * Tier B org account chrome — account shell data and surface translations.
 */
export async function OrgAccountDeferredWorkbench({
  children,
  locale,
  orgSlug,
  orgSession,
}: OrgAccountDeferredWorkbenchProps) {
  const [t, shellData] = await Promise.all([
    getTranslations("AccountSurface"),
    getAccountShellData(),
  ])

  const sections = [
    {
      id: "identity" as const,
      label: t("rail.identity"),
      description: t("rail.identityDescription"),
      href: organizationAccountPath(orgSlug, "identity"),
      matchPath: `/o/${orgSlug}/account/identity`,
    },
    {
      id: "orbit" as const,
      label: t("rail.orbit"),
      description: t("rail.orbitDescription"),
      href: organizationOrbitPath(orgSlug),
      matchPath: `/o/${orgSlug}/dashboard/orbit`,
    },
    {
      id: "sessions" as const,
      label: t("rail.sessions"),
      description: t("rail.sessionsDescription"),
      href: `${organizationAccountPath(orgSlug, "security")}#sessions`,
      matchPath: `/o/${orgSlug}/account/security`,
      activeHash: "sessions",
    },
    {
      id: "authority" as const,
      label: t("rail.security"),
      description: t("rail.securityDescription"),
      href: `${organizationAccountPath(orgSlug, "security")}#security`,
      matchPath: `/o/${orgSlug}/account/security`,
      activeHash: "security",
    },
    {
      id: "workspace" as const,
      label: t("rail.workspace"),
      description: t("rail.workspaceDescription"),
      href: organizationNexusPath(orgSlug),
    },
  ]

  const envelope: RouteEnvelope = {
    surface: "account",
    locale,
    orgSlug,
    orgId: orgSession.organizationId,
  }

  return (
    <AppSubLayout
      envelope={envelope}
      rail={{
        slots: {
          ...buildAccountRailSlotsV2({ sections }),
          footer: (
            <WorkbenchRailFooter
              avatarLabel={shellData.summary.displayName}
              primaryLabel={shellData.summary.displayName}
              secondaryLabel={shellData.summary.email}
              labels={{
                sidebarControl: t("rail.footer.sidebarMode"),
                expanded: t("rail.footer.expanded"),
                expandedHelp: t("rail.footer.expandedHelp"),
                collapsed: t("rail.footer.collapsed"),
                collapsedHelp: t("rail.footer.collapsedHelp"),
                expandOnHover: t("rail.footer.expandOnHover"),
                expandOnHoverHelp: t("rail.footer.expandOnHoverHelp"),
                current: t("rail.footer.current"),
              }}
            />
          ),
        },
        labels: {
          ariaLabel: t("rail.aria"),
          collapseLabel: t("rail.collapse"),
          expandLabel: t("rail.expand"),
          navSearchPlaceholder: t("rail.navSearchPlaceholder"),
          navSearchAriaLabel: t("rail.navSearchAriaLabel"),
          navSearchCollapsedTriggerAriaLabel: t(
            "rail.navSearchCollapsedTriggerAriaLabel"
          ),
          navSearchNoMatches: t("rail.navSearchNoMatches"),
        },
        storageKey: "afenda.org-account.rail",
      }}
      command={{
        title: t("title"),
        description: t("overview.subtitle"),
        sections: [
          {
            heading: t("rail.sectionsLabel"),
            items: sections.map((section) => ({
              label: section.label,
              href: section.href,
            })),
          },
        ],
      }}
    >
      {children}
    </AppSubLayout>
  )
}
