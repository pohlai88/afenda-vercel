import type { Metadata } from "next"

import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import {
  WorkbenchCommandLayer,
  WorkbenchSubLayout,
} from "#components/workbench"
import {
  canActInOrganization,
  fetchOrgWorkbenchIdentity,
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"
import {
  buildOrgAdminRailSlots,
  organizationAdminPath,
} from "#features/org-admin"

export const metadata: Metadata = {
  title: "Admin",
  openGraph: { title: `Organization admin | ${SITE_NAME}` },
}

export default async function OrgAdminWorkbenchLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/admin">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const resumeTo = toLocalePath(
    locale,
    organizationAdminPath(orgSlug, "overview")
  ) as unknown as string

  await requireRecentAuthStepUp({ returnTo: resumeTo })
  await requireVerifiedEmailForAccount(resumeTo)

  const orgSession = await requireOrgSession()

  const [canAdmin, identity, t] = await Promise.all([
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
    fetchOrgWorkbenchIdentity(orgSession.organizationId),
    getTranslations("OrgAdmin"),
  ])

  if (!canAdmin) {
    redirect(toLocalePath(locale, organizationDashboardPath(orgSlug, "home")))
  }
  if (!identity) {
    notFound()
  }

  const railSlots = buildOrgAdminRailSlots({
    orgSlug,
    orgName: identity.name,
  })

  const envelope: RouteEnvelope = {
    surface: "admin",
    locale,
    orgSlug,
    orgId: orgSession.organizationId,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>
      <WorkbenchSubLayout
        rail={{
          slots: railSlots,
          labels: {
            ariaLabel: t("nav.aria"),
            collapseLabel: "Collapse admin rail",
            expandLabel: "Expand admin rail",
          },
          storageKey: "afenda.orgAdmin.rail",
        }}
        commandLayer={
          <WorkbenchCommandLayer
            title={t("shell.kicker")}
            description={t("nav.aria")}
            sections={[
              {
                heading: t("nav.aria"),
                items: [
                  {
                    label: t("nav.overview"),
                    href: organizationAdminPath(orgSlug, "overview"),
                  },
                  {
                    label: t("nav.members"),
                    href: organizationAdminPath(orgSlug, "members"),
                  },
                  {
                    label: t("nav.audit"),
                    href: organizationAdminPath(orgSlug, "audit"),
                  },
                  {
                    label: t("nav.integrations"),
                    href: organizationAdminPath(orgSlug, "integrations"),
                  },
                  {
                    label: t("nav.settings"),
                    href: organizationAdminPath(orgSlug, "settings"),
                  },
                ],
              },
            ]}
          />
        }
      >
        {children}
      </WorkbenchSubLayout>
    </RouteEnvelopeProvider>
  )
}
