import { Suspense } from "react"

import { StatusControlSkeleton } from "#components2/legal-docs"

import { LegalDocsStatusBody } from "./legal-docs-status-body.server"

export function LegalDocsStatusPage() {
  return (
    <Suspense fallback={<StatusControlSkeleton />}>
      <LegalDocsStatusBody />
    </Suspense>
  )
}
