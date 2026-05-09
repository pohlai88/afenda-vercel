/**
 * Structural types for the public trust control surface (ported from afenda-next).
 */
import type {
  DeclarationLegalIdentity,
  DeclarationRelatedLink,
} from "#features/legal-declarations"

export type TrustSurfaceState = "live" | "planned" | "withheld"

export type TrustPostureSignal = {
  readonly id: string
  readonly label: string
  readonly state: TrustSurfaceState
  readonly summary: string
  readonly ownerRoute: string
  readonly proofSource: string
  readonly lastUpdatedLabel: string
  /** Locale-internal path (`/legal/...`) or absolute OpenStatus / vendor authority URL. */
  readonly href?: string
}

export type TrustEvidenceItem = {
  readonly id: string
  readonly title: string
  readonly statement: string
  readonly href: string
  readonly proofSource: string
  readonly lastUpdatedLabel: string
}

export type TrustSurfaceItem = {
  readonly id: string
  readonly label: string
  readonly route: `/${string}`
  readonly state: TrustSurfaceState
  readonly summary: string
  readonly ownerRoute: string
  readonly proofSource: string
  readonly lastUpdatedLabel: string
  readonly isPublicLink: boolean
  readonly activationRuleId?: string
  /** OpenStatus (or other) authority URL shown beside the branded /status wrapper. */
  readonly authorityUrl?: string
}

export type TrustCommitment = {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly expectation: string
  readonly ownerRoute: string
  readonly href?: string
}

export type TrustBoundaryStatement = {
  readonly id: string
  readonly title: string
  readonly detail: string
}

export type TrustActivationRule = {
  readonly id: string
  readonly surfaceLabel: string
  readonly route: `/${string}`
  readonly requirements: readonly string[]
}

export type TrustSurfaceDefinition = {
  readonly eyebrow: string
  readonly title: string
  readonly summary: string
  readonly description: string
  readonly doctrine: string
  readonly statusNote: string
  readonly lastUpdatedLabel: string
  readonly currentPosture: readonly TrustPostureSignal[]
  readonly evidence: readonly TrustEvidenceItem[]
  readonly surfaces: readonly TrustSurfaceItem[]
  readonly commitments: readonly TrustCommitment[]
  readonly boundaries: readonly TrustBoundaryStatement[]
  readonly activationRules: readonly TrustActivationRule[]
}

export type TrustControlSurfaceProps = {
  readonly definition: TrustSurfaceDefinition
  readonly legalIdentity: DeclarationLegalIdentity
  readonly footerLinks: readonly DeclarationRelatedLink[]
}
