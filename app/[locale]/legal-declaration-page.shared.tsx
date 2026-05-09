import type { Metadata } from "next"

import { DeclarationShell } from "#components/marketing/declaration-shell"
import {
  buildLegalDeclarationMetadata,
  declarationFooterIdentity,
  declarationFooterLinks,
  type DeclarationDocumentDefinition,
} from "#features/legal-declarations"
import { APP_LOCALES, ensureAppLocale } from "#lib/i18n/locales.shared"

export function generateDeclarationLocaleParams(): { locale: string }[] {
  return APP_LOCALES.map((locale) => ({ locale }))
}

export function buildStandaloneDeclarationMetadata(
  localeRaw: string,
  document: DeclarationDocumentDefinition
): Metadata {
  const locale = ensureAppLocale(localeRaw)
  return buildLegalDeclarationMetadata(locale, document)
}

export function renderStandaloneDeclarationPage(
  localeRaw: string,
  document: DeclarationDocumentDefinition
) {
  ensureAppLocale(localeRaw)

  return (
    <DeclarationShell
      document={document}
      footerLinks={declarationFooterLinks}
      legalIdentity={declarationFooterIdentity}
    />
  )
}
