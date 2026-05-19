import type { ReactNode } from "react"
import type { Route } from "next"
import { getTranslations } from "next-intl/server"

import { AppSubLayout } from "#app-shell"
import {
  AppShellCommandPalette,
  AppShellPrimaryLeftRailFooter,
} from "#app-shell/client"
import { organizationNexusPath } from "#features/nexus"
import { organizationOrbitPath } from "#features/orbit"
import { buildIamProfileRailSlots } from "#features/iam-profile/server"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import type { OrgSession } from "#lib/auth"

export type OrgIamProfileDeferredShellProps = {
  children: ReactNode
  locale: AppLocale
  orgSlug: string
  orgSession: OrgSession
}

/** Tier B org profile chrome — rail labels and command palette. */
export async function OrgIamProfileDeferredShell({
  children,
  locale,
  orgSlug,
  orgSession,
}: OrgIamProfileDeferredShellProps) {
  const t = await getTranslations("IamProfileSurface")

  const sections = [
    {
      id: "identity" as const,
      label: t("rail.identity"),
      description: t("rail.identityDescription"),
      href: organizationIamProfilePath(orgSlug, "identity"),
      matchPath: `/o/${orgSlug}/iam-profile/identity`,
    },
    {
      id: "orbit" as const,
      label: t("rail.orbit"),
      description: t("rail.orbitDescription"),
      href: organizationOrbitPath(orgSlug),
      matchPath: `/o/${orgSlug}/apps/orbit`,
    },
    {
      id: "sessions" as const,
      label: t("rail.sessions"),
      description: t("rail.sessionsDescription"),
      href: `${organizationIamProfilePath(orgSlug, "security")}#sessions`,
      matchPath: `/o/${orgSlug}/iam-profile/security`,
      activeHash: "sessions",
    },
    {
      id: "authority" as const,
      label: t("rail.security"),
      description: t("rail.securityDescription"),
      href: `${organizationIamProfilePath(orgSlug, "security")}#password`,
      matchPath: `/o/${orgSlug}/iam-profile/security`,
      activeHash: "password",
    },
    {
      id: "workspace" as const,
      label: t("rail.workspace"),
      description: t("rail.workspaceDescription"),
      href: organizationNexusPath(orgSlug),
    },
  ]

  const envelope: RouteEnvelope = {
    surface: "iam-profile",
    locale,
    orgSlug,
    orgId: orgSession.organizationId,
  }

  return (
    <AppSubLayout
      envelope={envelope}
      rail={{
        slots: {
          ...buildIamProfileRailSlots({ sections }),
          footer: (
            <AppShellPrimaryLeftRailFooter
              labels={{
                sidebarControl: t("rail.footer.sidebarMode"),
                expanded: t("rail.footer.expanded"),
                expandedHelp: t("rail.footer.expandedHelp"),
                collapsed: t("rail.footer.collapsed"),
                collapsedHelp: t("rail.footer.collapsedHelp"),
                hover: t("rail.footer.expandOnHover"),
                hoverHelp: t("rail.footer.expandOnHoverHelp"),
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
        storageKey: "afenda.org-iam-profile.rail",
      }}
      command={
        <AppShellCommandPalette
          dialogTitle={t("title")}
          dialogDescription={t("overview.subtitle")}
          sections={[
            {
              heading: t("rail.sectionsLabel"),
              items: sections.map((section) => ({
                id: `profile-${section.id}`,
                label: section.label,
                href: section.href as Route,
              })),
            },
          ]}
        />
      }
    >
      {children}
    </AppSubLayout>
  )
}
