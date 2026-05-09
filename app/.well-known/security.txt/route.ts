import { securityDisclosureLink } from "#features/legal-declarations"
import {
  publicTrustOwnerRoutes,
  securityTxtExpiresAt,
  securityTxtHref,
} from "#features/public-trust"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

export const dynamic = "force-static"

export function GET(): Response {
  const base = getSiteUrl().replace(/\/$/, "")
  const policyPath = toLocalePath(
    DEFAULT_APP_LOCALE,
    securityDisclosureLink.href
  )
  const body = [
    `Contact: mailto:${publicTrustOwnerRoutes.security.value}`,
    `Expires: ${securityTxtExpiresAt}`,
    "Preferred-Languages: en",
    `Canonical: ${base}${securityTxtHref}`,
    `Policy: ${base}${policyPath}`,
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
