import type { Metadata } from "next"

import { TrustControlSurface } from "#components/marketing/trust-control-surface"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
} from "#features/legal-declarations"
import {
  buildTrustPageMetadata,
  trustSurfaceDefinitionResolved,
} from "#features/public-trust"
import { APP_LOCALES, ensureAppLocale } from "#lib/i18n/locales.shared"

export function generateStaticParams(): { locale: string }[] {
  return APP_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/legal/trust">): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  return buildTrustPageMetadata(locale)
}

export default async function LegalTrustPage({
  params,
}: PageProps<"/[locale]/legal/trust">) {
  const { locale: localeRaw } = await params
  ensureAppLocale(localeRaw)

  const definition = trustSurfaceDefinitionResolved(
    process.env.OPENSTATUS_PUBLIC_STATUS_URL
  )

  return (
    <TrustControlSurface
      definition={definition}
      legalIdentity={declarationFooterIdentity}
      footerLinks={declarationFooterLinks}
    />
  )
}
