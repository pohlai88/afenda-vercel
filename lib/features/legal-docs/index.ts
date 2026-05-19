export type {
  DeclarationContactChannel,
  DeclarationDocumentDefinition,
  DeclarationLegalIdentity,
  DeclarationRelatedLink,
  DeclarationSection,
  LegalDeclarationSlug,
  TrustActivationRule,
  TrustBoundaryStatement,
  TrustCommitment,
  TrustControlSurfaceProps,
  TrustEvidenceItem,
  TrustPostureSignal,
  TrustSurfaceDefinition,
  TrustSurfaceItem,
  TrustSurfaceState,
} from "./types"

export {
  buildLegalDeclarationMetadata,
  declarationDocuments,
  declarationDocumentSlugs,
  declarationFooterIdentity,
  declarationFooterLinks,
  declarationRouteReviewedAtByHref,
  declarationRouteHrefs,
  latestLegalDeclarationReviewedAt,
} from "./data/declaration-registry.shared"

export type {
  DeclarationDocumentSlug,
  DeclarationRouteSlug,
} from "./data/declaration-registry.shared"

export {
  cookieNoticeLink,
  dataProcessingAddendumLink,
  LEGAL_ROUTE_PREFIX,
  securityDisclosureLink,
  subprocessorsLink,
  trustRouteLink,
} from "./data/footer.shared"

export {
  collectDeclarationCopy,
  declarationPlaceholderPatterns,
  declarationStalePhrases,
  formatDeclarationReviewedLabel,
  isHttpSourceRef,
  maxReviewedAt,
} from "./data/review.shared"

export {
  validateDeclarationRegistry,
  validateOfficialSourceRefs,
  type DeclarationValidationIssue,
} from "./data/validation.shared"

export {
  buildOpenStatusFeedUrl,
  fallbackOpenStatusSnapshot,
  normalizeOpenStatusFeed,
  normalizeOpenStatusState,
  type OpenStatusComponent,
  type OpenStatusEvent,
  type OpenStatusPublicSnapshot,
  type OpenStatusPublicState,
} from "./data/openstatus-status.shared"

export {
  buildLegalDocsStaticParams,
  isLegalDeclarationSlug,
  resolveLegalDocsSlug,
  type LegalDocsRouteKey,
} from "./data/legal-docs-routing.shared"

export {
  STATUS_ROUTE,
  buildStatusPageMetadata,
  buildTrustPageMetadata,
  publicTrustIndexableRoutes,
  publicTrustOwnerRoutes,
  securityTxtExpiresAt,
  securityTxtHref,
  trustSurfaceDefinition,
  trustSurfaceDefinitionBaseline,
  trustSurfaceDefinitionResolved,
  trustSurfaceLastUpdatedLabel,
} from "./data/trust-surface.fixture.shared"

export { generateLegalDocsMetadata } from "./data/legal-docs-metadata.server"

export { LegalDocsDeclarationPage } from "./components/legal-docs-declaration-page.server"
export { LegalDocsRoutePage } from "./components/legal-docs-route-page.server"

export const unstable_instant = { prefetch: "static" } as const
