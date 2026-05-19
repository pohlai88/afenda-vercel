import "server-only"

export {
  getCachedOpenStatusPublicSnapshot,
  resolveOpenStatusPublicSnapshot,
} from "./data/openstatus-status.server"

export { generateLegalDocsMetadata } from "./data/legal-docs-metadata.server"

export { LegalDocsDeclarationPage } from "./components/legal-docs-declaration-page.server"
export { LegalDocsRoutePage } from "./components/legal-docs-route-page.server"
