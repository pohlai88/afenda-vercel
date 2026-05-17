import { cacheLife } from "next/cache"

import { securityDisclosureLink } from "#features/legal-declarations"
import {
  publicTrustOwnerRoutes,
  securityTxtExpiresAt,
  securityTxtHref,
} from "#features/public-trust"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

export async function GET(): Promise<Response> {
  "use cache"
  cacheLife("max")

  const base = getSiteUrl().replace(/\/$/, "")
  const policyPath = toLocalePath(
    DEFAULT_APP_LOCALE,
    securityDisclosureLink.href as `/${string}`
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
