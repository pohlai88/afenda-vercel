import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import {
  WorkbenchCommandLayer,
  WorkbenchShell,
  WorkbenchUtilityBar,
} from "#components/workbench"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { requireRecentAuthStepUp } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireGlobalAdminSession } from "#lib/tenant"
import { buildPlatformAdminRailSlots } from "#features/platform-admin"

export const metadata: Metadata = {
  title: "Operator",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Operator | ${SITE_NAME}` },
}

export default async function OperatorLayout({
  children,
  params,
}: LayoutProps<"/[locale]/operator">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const session = await requireGlobalAdminSession()
  await requireRecentAuthStepUp({ returnTo: toLocalePath(locale, "/operator") })
  const t = await getTranslations("PlatformAdmin")

  const railSlots = buildPlatformAdminRailSlots({
    userName: session.user.name,
    userEmail: session.user.email,
  })

  const envelope: RouteEnvelope = {
    surface: "operator",
    locale,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>
      <WorkbenchShell
        skipToMainLabel={t("skipToMain")}
        utilityBar={
          <WorkbenchUtilityBar
            mode="no-org"
            userId={session.userId}
            userEmail={session.user.email}
          />
        }
        rail={{
          slots: railSlots,
          labels: {
            ariaLabel: t("nav.aria"),
            collapseLabel: "Collapse operator rail",
            expandLabel: "Expand operator rail",
          },
          storageKey: "afenda.operator.rail",
        }}
        commandLayer={
          <WorkbenchCommandLayer
            title={t("title")}
            description={t("description")}
            sections={[
              {
                heading: t("nav.aria"),
                items: [
                  { label: t("nav.overview"), href: "/operator" },
                  { label: t("nav.users"), href: "/operator/users" },
                  {
                    label: t("nav.organizations"),
                    href: "/operator/organizations",
                  },
                ],
              },
            ]}
          />
        }
      >
        {children}
      </WorkbenchShell>
    </RouteEnvelopeProvider>
  )
}
