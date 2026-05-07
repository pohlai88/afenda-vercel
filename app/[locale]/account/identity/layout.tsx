import type { ReactNode } from "react"

import { requireRecentAuthStepUp } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export default async function AccountIdentityLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, "/account/identity"),
  })
  return children
}
