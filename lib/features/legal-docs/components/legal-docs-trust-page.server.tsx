import { Suspense } from "react"

import { TrustControlSurface } from "#components2/legal-docs"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
} from "../data/declaration-registry.shared"

import { trustSurfaceDefinitionBaseline } from "../data/trust-surface.fixture.shared"
import { LegalDocsTrustBody } from "./legal-docs-trust-body.server"

export function LegalDocsTrustPage() {
  const baseline = trustSurfaceDefinitionBaseline()

  return (
    <Suspense
      fallback={
        <TrustControlSurface
          definition={baseline}
          footerLinks={declarationFooterLinks}
          legalIdentity={declarationFooterIdentity}
        />
      }
    >
      <LegalDocsTrustBody />
    </Suspense>
  )
}
