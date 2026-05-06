import "server-only"

import { cache } from "react"
import { headers } from "next/headers"

import { auth } from "#lib/auth/config.server"

/** Per-request dedupe of Better Auth session reads (React cache). */
export const getAuthSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)

/**
 * DB-backed session (disables cookie cache). Use for step-up and other
 * high-assurance checks per Better Auth session docs.
 */
export const getAuthSessionTrusted = cache(async () =>
  auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  })
)
