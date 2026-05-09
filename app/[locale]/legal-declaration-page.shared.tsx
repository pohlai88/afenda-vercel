import { DeclarationShell } from "#components/marketing/declaration-shell"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
  type DeclarationDocumentDefinition,
} from "#features/legal-declarations"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

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
