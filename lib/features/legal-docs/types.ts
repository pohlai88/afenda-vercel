/**
 * Structural types for public `/legal-docs/*` routes (declarations + trust surface).
 */

export type DeclarationSection = {
  readonly id: string
  readonly title: string
  readonly body: readonly string[]
  readonly bullets?: readonly string[]
}

/** Locale-internal declaration keys rendered under `/legal-docs/...`. */
export type LegalDeclarationSlug =
  | "cookies"
  | "data-processing-addendum"
  | "privacy"
  | "terms"
  | "security"
  | "security/disclosure"
  | "subprocessors"
  | "support"

export type DeclarationRelatedLink = {
  readonly href: string
  readonly label: string
  readonly description: string
}

export type DeclarationContactChannel = {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly href?: string
}

export type DeclarationLegalIdentity = {
  readonly legalEntityName: string
  readonly companyRegistrationNumber: string
  readonly incorporationStatement: string
  readonly regionalStatement: string
  readonly registeredAddress: string
  readonly websiteLabel: string
  readonly websiteValue: string
  readonly websiteHref: string
  readonly operationalSupportLabel: string
  readonly operationalSupportEmail: string
  readonly privacyInquiryLabel: string
  readonly privacyInquiryEmail: string
}

export type DeclarationDocumentDefinition = {
  readonly slug: string
  readonly routeHref?: `/${string}`
  readonly title: string
  readonly description: string
  readonly eyebrow: string
  readonly summary: string
  readonly sections: readonly DeclarationSection[]
  readonly relatedLinks: readonly DeclarationRelatedLink[]
  readonly contactChannels: readonly DeclarationContactChannel[]
  readonly reviewedAt: string
  readonly sourceRefs: readonly string[]
  readonly statusNote?: string
  readonly lastUpdatedLabel?: string
}

export type TrustSurfaceState = "live" | "planned" | "withheld"

export type TrustPostureSignal = {
  readonly id: string
  readonly label: string
  readonly state: TrustSurfaceState
  readonly summary: string
  readonly ownerRoute: string
  readonly proofSource: string
  readonly lastUpdatedLabel: string
  /** Locale-internal path (`/legal-docs/...`) or absolute OpenStatus / vendor authority URL. */
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
  /** OpenStatus (or other) authority URL shown beside the branded `/legal-docs/status` wrapper. */
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
