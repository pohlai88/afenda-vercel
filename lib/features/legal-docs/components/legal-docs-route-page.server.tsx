import { notFound } from "next/navigation"

import { ensureAppLocale } from "#lib/i18n/locales.shared"

import {
  declarationDocuments,
  type DeclarationSlug,
} from "../data/declaration-registry.shared"
import {
  isLegalDeclarationSlug,
  resolveLegalDocsSlug,
} from "../data/legal-docs-routing.shared"
import { LegalDocsDeclarationPage } from "./legal-docs-declaration-page.server"
import { LegalDocsStatusPage } from "./legal-docs-status-page.server"
import { LegalDocsTrustPage } from "./legal-docs-trust-page.server"

export async function LegalDocsRoutePage({
  params,
}: PageProps<"/[locale]/legal-docs/[...slug]">) {
  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)
  const key = resolveLegalDocsSlug(slug)

  if (!key) {
    notFound()
  }

  if (isLegalDeclarationSlug(key)) {
    return (
      <LegalDocsDeclarationPage
        locale={locale}
        document={declarationDocuments[key as DeclarationSlug]}
      />
    )
  }

  if (key === "trust") {
    return <LegalDocsTrustPage locale={locale} />
  }

  return <LegalDocsStatusPage locale={locale} />
}
