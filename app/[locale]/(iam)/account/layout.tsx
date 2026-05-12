import type { Metadata } from "next"

import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"

import { WorkbenchCommandLayer } from "#components/workbench"
import { WorkbenchShell } from "#components/workbench"
import { WorkbenchUtilityBar } from "#components/workbench"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { SignOutButton } from "#components/sign-out-button"
import { requireAuthShellSignedInSession } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { organizationNexusPath } from "#features/nexus"
import { accountOrbitPath } from "#features/planner"

import { buildAccountRailSlotsV2 } from "./_components/account-rail-slots"
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
  const messages = await getMessages()
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
      id: "orbit" as const,
      label: t("rail.orbit"),
      description: t("rail.orbitDescription"),
      href: toLocalePath(locale, accountOrbitPath()),
      matchPath: "/account/orbit",
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

  const summary = {
    ...shellData.summary,
    activeOrgHref: shellData.activeOrganization ? activeWorkspaceHref : null,
  }

  const railSlots = buildAccountRailSlotsV2({
    summary,
    sections,
  })

  const commandSections = [
    {
      heading: t("rail.sectionsLabel"),
      items: sections.map((s) => ({ label: s.label, href: s.href })),
    },
  ]

  return (
    <RouteEnvelopeProvider value={envelope}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <WorkbenchShell
          skipToMainLabel={t("skipToMain")}
          utilityBar={
            utilityBarOrg ? (
              <WorkbenchUtilityBar
                mode="org"
                orgSlug={utilityBarOrg.slug}
                orgName={utilityBarOrg.name}
                orgId={utilityBarOrg.id}
                userId={session.userId}
                userEmail={shellData.summary.email}
              />
            ) : (
              <WorkbenchUtilityBar
                mode="no-org"
                userId={session.userId}
                userEmail={shellData.summary.email}
              />
            )
          }
          rail={{
            slots: {
              ...railSlots,
              footer: <SignOutButton />,
            },
            labels: {
              ariaLabel: t("rail.aria"),
              collapseLabel: t("rail.collapse"),
              expandLabel: t("rail.expand"),
            },
            storageKey: "afenda.account.rail",
          }}
          commandLayer={
            <WorkbenchCommandLayer
              title={t("title")}
              description={t("overview.subtitle")}
              sections={commandSections}
            />
          }
        >
          {children}
        </WorkbenchShell>
      </NextIntlClientProvider>
    </RouteEnvelopeProvider>
  )
}
