import type { Metadata } from "next"

import { requireRecentAuthStepUp } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"
import { requireGlobalAdminSession } from "#lib/tenant"

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
  await requireGlobalAdminSession()
  await requireRecentAuthStepUp({ returnTo: toLocalePath(locale, "/operator") })
  return children
}
