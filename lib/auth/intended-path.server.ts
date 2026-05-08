import "server-only"

import { headers } from "next/headers"

import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { resolvePostAuthCallbackUrl } from "./callback-path"

import {
  AFENDA_PATHNAME_HEADER,
  AFENDA_SEARCH_HEADER,
} from "./forwarded-path-headers.shared"

const MAX_SEARCH_LEN = 2048

/**
 * Best-effort return path for the current document request (pathname + query).
 * Falls back to locale-prefixed `/en/o` when headers are missing (e.g. non-proxy context).
 */
export async function getIntendedReturnPathFromRequest(): Promise<string> {
  const locale = await getRequestAppLocale()
  const fallback = toLocalePath(locale, "/o")
  const h = await headers()
  const pathname = h.get(AFENDA_PATHNAME_HEADER)?.trim()
  if (!pathname || !pathname.startsWith("/")) {
    return resolvePostAuthCallbackUrl(null, fallback)
  }
  let search = h.get(AFENDA_SEARCH_HEADER)?.trim() ?? ""
  if (search.length > MAX_SEARCH_LEN) {
    search = search.slice(0, MAX_SEARCH_LEN)
  }
  const combined = search ? `${pathname}?${search}` : pathname
  return resolvePostAuthCallbackUrl(combined, fallback)
}
