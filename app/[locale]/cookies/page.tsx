import type { Metadata } from "next"

import { DeclarationShell } from "#components/marketing/declaration-shell"
import {
  buildLegalDeclarationMetadata,
  declarationDocuments,
  declarationFooterIdentity,
  declarationFooterLinks,
} from "#features/legal-declarations"
import { APP_LOCALES, ensureAppLocale } from "#lib/i18n/locales.shared"

export function generateStaticParams(): { locale: string }[] {
  return APP_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cookies">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return buildLegalDeclarationMetadata(locale, declarationDocuments.cookies)
}

export default async function CookieNoticePage({
  params,
}: PageProps<"/[locale]/cookies">) {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)

  return (
    <DeclarationShell
      document={declarationDocuments.cookies}
      footerLinks={declarationFooterLinks}
      legalIdentity={declarationFooterIdentity}
    />
  )
}
