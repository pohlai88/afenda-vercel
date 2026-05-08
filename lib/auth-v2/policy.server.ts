import "server-only"

import { AUTH_STATUS } from "#lib/auth/auth-status.shared"

import { auth } from "./server"
import { redirectToAuthInterruptionV2 } from "./interruption-redirect.server"

export async function requireVerifiedEmailForAccount(
  returnTo: string
): Promise<void> {
  const { data: session } = await auth.getSession()

  if (!session || !session.user?.id) {
    await redirectToAuthInterruptionV2(AUTH_STATUS.SESSION_EXPIRED, {
      callbackPath: returnTo,
    })
  }

  const user = session!.user
  if (!user.emailVerified) {
    await redirectToAuthInterruptionV2(AUTH_STATUS.EMAIL_UNVERIFIED, {
      callbackPath: returnTo,
    })
  }
}
