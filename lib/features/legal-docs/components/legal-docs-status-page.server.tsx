import { Suspense } from "react"

import { StatusControlSkeleton } from "#components2/legal-docs"
import type { AppLocale } from "#lib/i18n/locales.shared"

import { LegalDocsStatusBody } from "./legal-docs-status-body.server"

export function LegalDocsStatusPage({
  locale,
}: {
  readonly locale: AppLocale
}) {
  return (
    <Suspense fallback={<StatusControlSkeleton />}>
      <LegalDocsStatusBody locale={locale} />
    </Suspense>
  )
}
