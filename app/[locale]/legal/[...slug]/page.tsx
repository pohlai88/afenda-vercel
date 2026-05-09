import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DeclarationShell } from "#components/marketing/declaration-shell"
import {
  buildLegalDeclarationMetadata,
  declarationDocuments,
  declarationDocumentSlugs,
  declarationFooterIdentity,
  declarationFooterLinks,
  type LegalDeclarationSlug,
} from "#features/legal-declarations"
import { APP_LOCALES, ensureAppLocale } from "#lib/i18n/locales.shared"

function slugToDeclarationKey(segments: string[]): LegalDeclarationSlug | null {
  const joined = segments.join("/")
  if (!joined) return null
  if (!(declarationDocumentSlugs as readonly string[]).includes(joined)) {
    return null
  }
  return joined as LegalDeclarationSlug
}

export async function generateStaticParams(): Promise<
  { locale: string; slug: string[] }[]
> {
  const out: { locale: string; slug: string[] }[] = []
  for (const locale of APP_LOCALES) {
    for (const key of declarationDocumentSlugs) {
      out.push({ locale, slug: key.split("/") })
    }
  }
  return out
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/legal/[...slug]">): Promise<Metadata> {
  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)
  const key = slugToDeclarationKey(slug)
  if (!key) {
    return {}
  }
  const doc = declarationDocuments[key]
  return buildLegalDeclarationMetadata(locale, doc)
}

export default async function LegalDeclarationPage({
  params,
}: PageProps<"/[locale]/legal/[...slug]">) {
  const { locale: localeRaw, slug } = await params
  ensureAppLocale(localeRaw)
  const key = slugToDeclarationKey(slug)
  if (!key) {
    notFound()
  }
  const doc = declarationDocuments[key]

  return (
    <DeclarationShell
      document={doc}
      footerLinks={declarationFooterLinks}
      legalIdentity={declarationFooterIdentity}
    />
  )
}
