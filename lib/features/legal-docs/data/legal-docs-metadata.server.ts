import "server-only"

import type { Metadata } from "next"

import {
  buildLegalDeclarationMetadata,
  declarationDocuments,
  type DeclarationSlug,
} from "./declaration-registry.shared"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

import {
  isLegalDeclarationSlug,
  resolveLegalDocsSlug,
} from "./legal-docs-routing.shared"
import {
  buildStatusPageMetadata,
  buildTrustPageMetadata,
} from "./trust-surface.fixture.shared"

export async function generateLegalDocsMetadata({
  params,
}: PageProps<"/[locale]/legal-docs/[...slug]">): Promise<Metadata> {
  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)
  const key = resolveLegalDocsSlug(slug)

  if (!key) return {}
  if (isLegalDeclarationSlug(key)) {
    return buildLegalDeclarationMetadata(
      locale,
      declarationDocuments[key as DeclarationSlug]
    )
  }
  if (key === "trust") return buildTrustPageMetadata(locale)
  return buildStatusPageMetadata(locale)
}
