import { Suspense } from "react"

import { TrustControlSurface } from "#components2/legal-docs"
import type { AppLocale } from "#lib/i18n/locales.shared"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
} from "../data/declaration-registry.shared"

import { trustSurfaceDefinitionBaseline } from "../data/trust-surface.fixture.shared"
import { LegalDocsTrustBody } from "./legal-docs-trust-body.server"

export function LegalDocsTrustPage({ locale }: { readonly locale: AppLocale }) {
  const baseline = trustSurfaceDefinitionBaseline()

  return (
    <Suspense
      fallback={
        <TrustControlSurface
          locale={locale}
          definition={baseline}
          footerLinks={declarationFooterLinks}
          legalIdentity={declarationFooterIdentity}
        />
      }
    >
      <LegalDocsTrustBody locale={locale} />
    </Suspense>
  )
}
