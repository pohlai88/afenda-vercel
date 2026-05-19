import { TrustControlSurface } from "#components2/legal-docs"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
} from "../data/declaration-registry.shared"

import { getCachedOpenStatusPublicSnapshot } from "../data/openstatus-status.server"
import { trustSurfaceDefinitionResolved } from "../data/trust-surface.fixture.shared"

export async function LegalDocsTrustBody() {
  const snapshot = await getCachedOpenStatusPublicSnapshot()
  const definition = trustSurfaceDefinitionResolved(snapshot)

  return (
    <TrustControlSurface
      definition={definition}
      legalIdentity={declarationFooterIdentity}
      footerLinks={declarationFooterLinks}
    />
  )
}
