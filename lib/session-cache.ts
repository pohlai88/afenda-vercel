import "server-only"

import { cache } from "react"
import { headers } from "next/headers"

import { auth } from "#lib/auth/neon.server"

/** Per-request dedupe of Neon Auth session reads (React cache). */
export const getAuthSession = cache(async () => {
  const { data } = await auth.getSession({
    fetchOptions: { headers: await headers() },
  })
  return data ?? null
})

/**
 * Session read without relying on signed session_data cookie cache (step-up).
 * Uses `disableCookieCache` query matching Neon Auth server wrapper.
 */
export const getAuthSessionTrusted = cache(async () => {
  const { data } = await auth.getSession({
    query: { disableCookieCache: "true" },
    fetchOptions: { headers: await headers() },
  })
  return data ?? null
})
