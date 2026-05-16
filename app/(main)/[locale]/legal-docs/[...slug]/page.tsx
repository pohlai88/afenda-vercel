import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { renderStandaloneDeclarationPage } from "../../legal-declaration-page.shared"
import { StatusControlSurface } from "#components/marketing/status-control-surface"
import { TrustControlSurface } from "#components/marketing/trust-control-surface"
import {
  buildLegalDeclarationMetadata,
  declarationDocuments,
  declarationDocumentSlugs,
  declarationFooterIdentity,
  declarationFooterLinks,
  type LegalDeclarationSlug,
} from "#features/legal-declarations"
import {
  buildTrustPageMetadata,
  STATUS_ROUTE,
  trustSurfaceDefinitionResolved,
} from "#features/public-trust"
import { resolveOpenStatusPublicSnapshot } from "#features/public-trust/server"
import { APP_LOCALES, ensureAppLocale } from "#lib/i18n/locales.shared"
import { SITE_NAME, getSiteUrl } from "#lib/site"

const publicDocsAuxiliarySlugs = ["trust", "status"] as const
type PublicDocsSlug =
  | LegalDeclarationSlug
  | (typeof publicDocsAuxiliarySlugs)[number]
const publicDocsSlugSet = new Set<string>([
  ...declarationDocumentSlugs,
  ...publicDocsAuxiliarySlugs,
])

function slugToPublicDocsKey(segments: string[]): PublicDocsSlug | null {
  const joined = segments.join("/")
  if (!joined) return null
  return publicDocsSlugSet.has(joined) ? (joined as PublicDocsSlug) : null
}

function isDeclarationSlug(slug: PublicDocsSlug): slug is LegalDeclarationSlug {
  return slug in declarationDocuments
}

function buildStatusPageMetadata(locale: string): Metadata {
  const canonicalPath = `/${locale}${STATUS_ROUTE}`

  return {
    title: `Status | ${SITE_NAME}`,
    description:
      "Afenda public availability evidence surface, reflecting OpenStatus when available and disclosing source-health gaps when the authority is unavailable or not yet configured.",
    alternates: {
      canonical: `${getSiteUrl().replace(/\/$/, "")}${canonicalPath}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export async function generateStaticParams(): Promise<
  { locale: string; slug: string[] }[]
> {
  const out: { locale: string; slug: string[] }[] = []
  for (const locale of APP_LOCALES) {
    for (const slug of [
      ...declarationDocumentSlugs,
      ...publicDocsAuxiliarySlugs,
    ]) {
      out.push({ locale, slug: slug.split("/") })
    }
  }
  return out
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/legal-docs/[...slug]">): Promise<Metadata> {
  const { locale: localeRaw, slug } = await params
  const locale = ensureAppLocale(localeRaw)
  const key = slugToPublicDocsKey(slug)

  if (!key) return {}
  if (isDeclarationSlug(key)) {
    return buildLegalDeclarationMetadata(locale, declarationDocuments[key])
  }
  if (key === "trust") {
    return buildTrustPageMetadata(locale)
  }
  return buildStatusPageMetadata(locale)
}

export default async function PublicDocsPage({
  params,
}: PageProps<"/[locale]/legal-docs/[...slug]">) {
  const { locale: localeRaw, slug } = await params
  ensureAppLocale(localeRaw)
  const key = slugToPublicDocsKey(slug)

  if (!key) {
    notFound()
  }

  if (isDeclarationSlug(key)) {
    return renderStandaloneDeclarationPage(localeRaw, declarationDocuments[key])
  }

  if (key === "trust") {
    const snapshot = await resolveOpenStatusPublicSnapshot()
    const definition = trustSurfaceDefinitionResolved(snapshot)

    return (
      <TrustControlSurface
        definition={definition}
        legalIdentity={declarationFooterIdentity}
        footerLinks={declarationFooterLinks}
      />
    )
  }

  const snapshot = await resolveOpenStatusPublicSnapshot()
  return <StatusControlSurface snapshot={snapshot} />
}
