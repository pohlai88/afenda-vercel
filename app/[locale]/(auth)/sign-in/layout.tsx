import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"

import { pickSignInShellMessages } from "#lib/i18n/auth-shell-messages.shared"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations({ locale, namespace: "Auth" })
  return {
    title: t("pageMetadataTitle"),
    robots: { index: false, follow: false },
    openGraph: { title: t("pageOpenGraphTitle", { siteName: SITE_NAME }) },
  }
}

export default async function SignInLayout({
  children,
  params,
}: LayoutProps<"/[locale]/sign-in">) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const all = await getMessages()
  const messages = pickSignInShellMessages(all)
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
