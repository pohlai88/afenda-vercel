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
  declarationRouteHrefs,
  declarationRouteSlugs,
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
