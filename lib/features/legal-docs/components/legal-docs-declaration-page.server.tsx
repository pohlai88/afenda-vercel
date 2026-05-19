import { cacheLife } from "next/cache"

import { DeclarationShell } from "#components2/legal-docs"
import type { DeclarationDocumentDefinition } from "../types"
import {
  declarationFooterIdentity,
  declarationFooterLinks,
} from "../data/declaration-registry.shared"

export async function LegalDocsDeclarationPage({
  document,
}: {
  readonly document: DeclarationDocumentDefinition
}) {
  "use cache"
  cacheLife("max")

  return (
    <DeclarationShell
      document={document}
      footerLinks={declarationFooterLinks}
      legalIdentity={declarationFooterIdentity}
    />
  )
}
