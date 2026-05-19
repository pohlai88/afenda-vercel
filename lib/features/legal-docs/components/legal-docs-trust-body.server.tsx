import { TrustControlSurface } from "#components2/legal-docs"
import type { AppLocale } from "#lib/i18n/locales.shared"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
} from "../data/declaration-registry.shared"

import { getCachedOpenStatusPublicSnapshot } from "../data/openstatus-status.server"
import { trustSurfaceDefinitionResolved } from "../data/trust-surface.fixture.shared"

export async function LegalDocsTrustBody({
  locale,
}: {
  readonly locale: AppLocale
}) {
  const snapshot = await getCachedOpenStatusPublicSnapshot()
  const definition = trustSurfaceDefinitionResolved(snapshot)

  return (
    <TrustControlSurface
      locale={locale}
      definition={definition}
      legalIdentity={declarationFooterIdentity}
      footerLinks={declarationFooterLinks}
    />
  )
}
