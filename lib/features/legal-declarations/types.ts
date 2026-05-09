/**
 * Structural types for public legal / declaration routes (ported from afenda-next marketing).
 */
export type DeclarationSection = {
  readonly id: string
  readonly title: string
  readonly body: readonly string[]
  readonly bullets?: readonly string[]
}

/** Locale-internal declaration keys. Most render under `/legal/`; cookies renders at `/cookies`. */
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
  readonly statusNote?: string
  readonly lastUpdatedLabel?: string
}
