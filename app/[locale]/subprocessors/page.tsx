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
}: PageProps<"/[locale]/subprocessors">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  return buildLegalDeclarationMetadata(
    locale,
    declarationDocuments.subprocessors
  )
}

export default async function SubprocessorsPage({
  params,
}: PageProps<"/[locale]/subprocessors">) {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)

  return (
    <DeclarationShell
      document={declarationDocuments.subprocessors}
      footerLinks={declarationFooterLinks}
      legalIdentity={declarationFooterIdentity}
    />
  )
}
