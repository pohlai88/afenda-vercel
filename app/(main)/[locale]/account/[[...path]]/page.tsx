import { redirectLegacyAuthenticatedSurfaceAlias } from "#lib/auth/legacy-authenticated-route-alias.server"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"

/**
 * Legacy `/account/*` → `/o/{activeOrgSlug}/account/*` or org Orbit (session-aware).
 * Single App Router entry — canonical UI lives under `o/[orgSlug]/account/*` (ADR-0029).
 */
export default async function LegacyAccountCatchAllPage({
  params,
}: PageProps<"/[locale]/account/[[...path]]">) {
  const { locale: localeRaw } = await params
  const locale = bindRequestLocale(localeRaw)
  await redirectLegacyAuthenticatedSurfaceAlias({ locale, surface: "account" })
}
