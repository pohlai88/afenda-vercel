import type { Metadata } from "next"

import {
  buildStandaloneDeclarationMetadata,
  generateDeclarationLocaleParams,
  renderStandaloneDeclarationPage,
} from "../legal-declaration-page.shared"
import { declarationDocuments } from "#features/legal-declarations"
import { ensureAppLocale } from "#lib/i18n/locales.shared"

export function generateStaticParams(): { locale: string }[] {
  return generateDeclarationLocaleParams()
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cookies">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  return buildStandaloneDeclarationMetadata(
    localeRaw,
    declarationDocuments.cookies
  )
}

export default async function CookieNoticePage({
  params,
}: PageProps<"/[locale]/cookies">) {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)
  return renderStandaloneDeclarationPage(
    localeRaw,
    declarationDocuments.cookies
  )
}
