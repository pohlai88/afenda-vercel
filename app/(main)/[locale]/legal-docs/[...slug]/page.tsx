export const unstable_instant = { prefetch: "static" }

export { buildLegalDocsStaticParams as generateStaticParams } from "#features/legal-docs"

export {
  generateLegalDocsMetadata as generateMetadata,
  LegalDocsRoutePage as default,
} from "#features/legal-docs/server"
