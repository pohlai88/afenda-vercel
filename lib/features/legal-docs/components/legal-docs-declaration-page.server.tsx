import { cacheLife } from "next/cache"

import { DeclarationShell } from "#components2/legal-docs"
import type { AppLocale } from "#lib/i18n/locales.shared"
import type { DeclarationDocumentDefinition } from "../types"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
} from "../data/declaration-registry.shared"

export async function LegalDocsDeclarationPage({
  locale,
  document,
}: {
  readonly locale: AppLocale
  readonly document: DeclarationDocumentDefinition
}) {
  "use cache"
  cacheLife("max")

  return (
    <DeclarationShell
      locale={locale}
      document={document}
      footerLinks={declarationFooterLinks}
      legalIdentity={declarationFooterIdentity}
    />
  )
}
