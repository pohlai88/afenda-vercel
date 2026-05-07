import "server-only"

import { AUTH_STATUS } from "./auth-status.shared"
import { redirectToAuthInterruption } from "./interruption-redirect.server"
import { getAuthSessionTrusted } from "#lib/session-cache"

import { isSessionFresh } from "./session-policy.server"

/**
 * Ensures the user has a **fresh** session (see Better Auth `freshAge`) using a
 * DB-backed `getSession` (`disableCookieCache`) so cookie cache cannot bypass step-up.
 * Use on sensitive routes (admin, security settings).
 *
 * Unauthenticated or stale sessions redirect via the shared interruption surface
 * (`/session-expired?authStatus=…`) so copy and return paths stay consistent with
 * tenant guards (Next.js `redirect` in Server Components).
 */
export async function requireRecentAuthStepUp(options: {
  /** Relative path (+ optional query) to resume after sign-in. */
  returnTo: string
}): Promise<void> {
  const record = await getAuthSessionTrusted()
  if (!record?.session) {
    await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED, {
      callbackPath: options.returnTo,
    })
  }
  const sessionBody = record!.session
  if (!isSessionFresh(sessionBody)) {
    await redirectToAuthInterruption(AUTH_STATUS.STEP_UP_REQUIRED, {
      callbackPath: options.returnTo,
    })
  }
}
