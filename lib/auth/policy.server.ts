import "server-only"

import { getAuthSessionTrusted } from "#lib/session-cache"

import { AUTH_STATUS } from "./auth-status.shared"
import { redirectToAuthInterruption } from "./interruption-redirect.server"

/**
 * Requires a signed-in user with a verified email (Better Auth `emailVerified`).
 * Missing session uses the shared interruption surface; unverified email uses
 * `/verify-email` (see `resolveAuthStatusContent` for copy and CTAs).
 */
export async function requireVerifiedEmailForAccount(
  returnTo: string
): Promise<void> {
  const session = await getAuthSessionTrusted()

  if (!session?.user?.id) {
    await redirectToAuthInterruption(AUTH_STATUS.SESSION_EXPIRED, {
      callbackPath: returnTo,
    })
  }

  if (!session!.user.emailVerified) {
    await redirectToAuthInterruption(AUTH_STATUS.EMAIL_UNVERIFIED, {
      callbackPath: returnTo,
    })
  }
}
