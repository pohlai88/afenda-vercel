import type { Route } from "next"
import { redirect } from "next/navigation"

import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

/**
 * Alias for `/verify-email` so product copy can say "check your email" with a
 * stable path; preserves query params (e.g. `callbackUrl`).
 */
export default async function CheckEmailPage({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  params: Promise<{ locale: string }>
}) {
  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const sp = await searchParams
  const q = new URLSearchParams()
  for (const [key, raw] of Object.entries(sp)) {
    if (raw == null) continue
    if (Array.isArray(raw)) {
      for (const v of raw) q.append(key, v)
    } else {
      q.set(key, raw)
    }
  }
  const suffix = q.toString()
  redirect(
    `${toLocalePath(locale, "/verify-email")}${suffix ? `?${suffix}` : ""}` as Route
  )
}
