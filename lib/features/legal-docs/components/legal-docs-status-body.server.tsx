import { StatusControlSurface } from "#components2/legal-docs"
import type { AppLocale } from "#lib/i18n/locales.shared"

import { getCachedOpenStatusPublicSnapshot } from "../data/openstatus-status.server"

export async function LegalDocsStatusBody({
  locale,
}: {
  readonly locale: AppLocale
}) {
  const snapshot = await getCachedOpenStatusPublicSnapshot()

  return <StatusControlSurface locale={locale} snapshot={snapshot} />
}
