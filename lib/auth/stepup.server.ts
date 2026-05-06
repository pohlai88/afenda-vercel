import "server-only"

import type { Route } from "next"
import { redirect } from "next/navigation"

import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { getAuthSessionTrusted } from "#lib/session-cache"

import { isSessionFresh } from "./session-policy.server"

function signInRedirect(returnTo: string, opts?: { stepUp?: boolean }): string {
  const safe = resolvePostAuthCallbackUrl(returnTo)
  const p = new URLSearchParams()
  p.set("callbackUrl", safe)
  if (opts?.stepUp) p.set("stepUp", "1")
  return `/sign-in?${p.toString()}`
}

/**
 * Ensures the user has a **fresh** session (see Better Auth `freshAge`) using a
 * DB-backed `getSession` (`disableCookieCache`) so cookie cache cannot bypass step-up.
 * Use on sensitive routes (admin, security settings).
 */
export async function requireRecentAuthStepUp(options: {
  /** Relative path (+ optional query) to resume after sign-in. */
  returnTo: string
}): Promise<void> {
  const session = await getAuthSessionTrusted()

  if (!session?.session) {
    redirect(signInRedirect(options.returnTo) as Route)
  }

  if (!isSessionFresh(session.session)) {
    redirect(signInRedirect(options.returnTo, { stepUp: true }) as Route)
  }
}
