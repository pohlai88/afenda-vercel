import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import {
  AppShell,
  AppSubLayoutShellSkeleton,
  buildAppShellPlatformUtilityBarSlots,
} from "#app-shell"
import { requireGlobalAdminSession } from "#lib/auth"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import { SITE_NAME } from "#lib/site"

import { PlatformDeferredShell } from "./_components/platform-deferred-shell"

export const metadata: Metadata = {
  title: "Platform",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Platform | ${SITE_NAME}` },
}

export default function PlatformLayout({
  children,
  params,
}: LayoutProps<"/[locale]/platform">) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading platform console" />
      }
    >
      <PlatformLayoutInner params={params}>{children}</PlatformLayoutInner>
    </Suspense>
  )
}

async function PlatformLayoutInner({
  children,
  params,
}: LayoutProps<"/[locale]/platform">) {
  const { locale: localeRaw } = await params
  const locale = bindRequestLocale(localeRaw)
  const session = await requireGlobalAdminSession()

  const t = await getTranslations("PlatformAdmin")

  const envelope: RouteEnvelope = {
    surface: "platform",
    locale,
  }

  const utilityBar = await buildAppShellPlatformUtilityBarSlots({
    locale,
    userEmail: session.user.email,
  })

  return (
    <AppShell
      envelope={envelope}
      skipToMainLabel={t("skipToMain")}
      utilityBar={utilityBar}
      rail={null}
    >
      <PlatformDeferredShell locale={locale}>{children}</PlatformDeferredShell>
    </AppShell>
  )
}
