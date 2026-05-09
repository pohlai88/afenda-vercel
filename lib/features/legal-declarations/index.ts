export type {
  DeclarationContactChannel,
  DeclarationDocumentDefinition,
  DeclarationLegalIdentity,
  DeclarationRelatedLink,
  DeclarationSection,
  LegalDeclarationSlug,
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
