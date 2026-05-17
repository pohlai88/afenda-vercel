import { redirect } from "next/navigation"

import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { candidatePortalPath } from "#lib/portal"

export const dynamic = "force-dynamic"

type CandidatePortalIndexProps = {
  params: Promise<{ locale: string; portalSlug: string }>
}

export default async function CandidatePortalIndexPage({
  params,
}: CandidatePortalIndexProps) {
  const { locale: rawLocale, portalSlug } = await params
  const locale = ensureAppLocale(rawLocale)
  redirect(toLocalePath(locale, candidatePortalPath(portalSlug, "careers")))
}
