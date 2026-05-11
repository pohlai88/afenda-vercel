import type { Metadata } from "next"

import { getTranslations } from "next-intl/server"

import { NexusUtilityBar } from "#components/nexus/nexus-utility-bar"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { requireAuthShellSignedInSession } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { organizationNexusPath } from "#features/nexus"

import { AccountOperatingShell } from "./_components/account-operating-shell"
import { getAccountShellData } from "./_components/account-shell-data.server"

export const metadata: Metadata = {
  title: "Account",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Account | ${SITE_NAME}` },
}

export const dynamic = "force-dynamic"

/**
 * Locale-internal `/account` layout.
 *
 * The proxy already gates `/account` for session cookie presence; this layout
 * adds defense-in-depth by validating the session record itself. Subsection
 * layouts (identity / security) chain in step-up + verified-email guards.
 */
export default async function AccountLayout({
  children,
  params,
}: LayoutProps<"/[locale]/account">) {
  const session = await requireAuthShellSignedInSession()
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations("AccountSurface")
  const shellData = await getAccountShellData()
  const utilityBarOrg =
    shellData.activeOrganization ?? shellData.organizations[0] ?? null
  const activeWorkspaceHref = shellData.activeOrganization
    ? toLocalePath(
        locale,
        organizationNexusPath(shellData.activeOrganization.slug)
      )
    : toLocalePath(locale, "/o")
  const envelope: RouteEnvelope = {
    surface: "account",
    locale,
  }

  const sections = [
    {
      id: "identity" as const,
      label: t("rail.identity"),
      description: t("rail.identityDescription"),
      href: toLocalePath(locale, "/account/identity"),
      matchPath: "/account/identity",
    },
    {
      id: "sessions" as const,
      label: t("rail.sessions"),
      description: t("rail.sessionsDescription"),
      href: `${toLocalePath(locale, "/account/security")}#sessions`,
      matchPath: "/account/security",
    },
    {
      id: "authority" as const,
      label: t("rail.security"),
      description: t("rail.securityDescription"),
      href: `${toLocalePath(locale, "/account/security")}#security`,
      matchPath: "/account/security",
    },
    {
      id: "workspace" as const,
      label: t("rail.workspace"),
      description: t("rail.workspaceDescription"),
      href: activeWorkspaceHref,
    },
  ]

  const quickActions = [
    {
      type: "link" as const,
      label: t("quickActions.addPasskey"),
      description: t("quickActions.addPasskeyDescription"),
      href: `${toLocalePath(locale, "/account/security")}#passkeys`,
    },
    {
      type: "link" as const,
      label: t("quickActions.signOutOthers"),
      description: t("quickActions.signOutOthersDescription"),
      href: `${toLocalePath(locale, "/account/security")}#sessions`,
    },
    {
      type: "signout" as const,
      label: t("quickActions.signOut"),
      description: t("quickActions.signOutDescription"),
    },
  ]

  const recentContexts = [
    shellData.activeOrganization
      ? {
          label: t("recent.activeWorkspace"),
          value: shellData.activeOrganization.name,
          href: activeWorkspaceHref,
        }
      : null,
    shellData.securityActivity[0]
      ? {
          label: t("recent.securityChange"),
          value: shellData.securityActivity[0].label,
          href:
            shellData.securityActivity[0].path ??
            toLocalePath(locale, "/account/security"),
        }
      : null,
    shellData.securityActivity[1]
      ? {
          label: t("recent.recentEvidence"),
          value: shellData.securityActivity[1].label,
          href:
            shellData.securityActivity[1].path ??
            toLocalePath(locale, "/account/security"),
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  const signals = [
    {
      label: t("signals.verification"),
      value: shellData.summary.emailVerified
        ? t("signals.verificationReady")
        : t("signals.verificationPending"),
      tone: shellData.summary.emailVerified
        ? ("positive" as const)
        : ("attention" as const),
    },
    {
      label: t("signals.sessionCount"),
      value: t("signals.sessionCountValue", {
        count: shellData.summary.sessionCount,
      }),
    },
    {
      label: t("signals.accessHealth"),
      value: shellData.activeOrganization
        ? t("signals.accessHealthy")
        : t("signals.accessNeedsWorkspace"),
      tone: shellData.activeOrganization
        ? ("positive" as const)
        : ("attention" as const),
    },
  ]

  return (
    <RouteEnvelopeProvider value={envelope}>
      <AccountOperatingShell
        title={t("title")}
        railLabel={t("rail.aria")}
        railDescription={t("rail.description")}
        sectionsLabel={t("rail.sectionsLabel")}
        quickActionsLabel={t("rail.quickActionsLabel")}
        recentLabel={t("rail.recentLabel")}
        signalsLabel={t("rail.signalsLabel")}
        collapseRailLabel={t("rail.collapse")}
        expandRailLabel={t("rail.expand")}
        summary={{
          ...shellData.summary,
          activeOrgHref: shellData.activeOrganization
            ? activeWorkspaceHref
            : null,
        }}
        sections={sections}
        quickActions={quickActions}
        recentContexts={recentContexts}
        signals={signals}
        utilityBar={
          utilityBarOrg ? (
            <NexusUtilityBar
              orgSlug={utilityBarOrg.slug}
              orgName={utilityBarOrg.name}
              orgId={utilityBarOrg.id}
              userId={session.userId}
              userEmail={shellData.summary.email}
            />
          ) : null
        }
      >
        {children}
      </AccountOperatingShell>
    </RouteEnvelopeProvider>
  )
}
