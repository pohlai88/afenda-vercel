import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME } from "#lib/site"

export async function generateMetadata({
  params,
}: Pick<LayoutProps<"/[locale]/sign-in">, "params">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const t = await getTranslations({ locale, namespace: "Auth" })
  return {
    title: t("pageMetadataTitle"),
    openGraph: { title: t("pageOpenGraphTitle", { siteName: SITE_NAME }) },
  }
}

export default function SignInLayout({
  children,
}: LayoutProps<"/[locale]/sign-in">) {
  return children
}
