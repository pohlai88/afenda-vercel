import type { ReactNode } from "react"

import { requireRecentAuthStepUp } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { requireGlobalAdminSession } from "#lib/tenant"

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await requireGlobalAdminSession()
  await requireRecentAuthStepUp({ returnTo: toLocalePath(locale, "/admin") })
  return children
}
