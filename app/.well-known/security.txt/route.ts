import { cacheLife } from "next/cache"

import {
  publicTrustOwnerRoutes,
  securityDisclosureLink,
  securityTxtExpiresAt,
  securityTxtHref,
} from "#features/legal-docs"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

async function buildSecurityTxtBody(): Promise<string> {
  "use cache"
  cacheLife("max")

  const base = getSiteUrl().replace(/\/$/, "")
  const policyPath = toLocalePath(
    DEFAULT_APP_LOCALE,
    securityDisclosureLink.href as `/${string}`
  )
  return [
    `Contact: mailto:${publicTrustOwnerRoutes.security.value}`,
    `Expires: ${securityTxtExpiresAt}`,
    "Preferred-Languages: en",
    `Canonical: ${base}${securityTxtHref}`,
    `Policy: ${base}${policyPath}`,
    "",
  ].join("\n")
}

export async function GET(): Promise<Response> {
  const body = await buildSecurityTxtBody()

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
