import "server-only"

import type { Route } from "next"
import { redirect } from "next/navigation"

import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"
import { getAuthSessionTrusted } from "#lib/session-cache"

/**
 * Requires a signed-in user with a verified email (Better Auth `emailVerified`).
 * Unverified users are sent to Identity to complete verification flows.
 */
export async function requireVerifiedEmailForAccount(returnTo: string): Promise<void> {
  const session = await getAuthSessionTrusted()

  if (!session?.user?.id) {
    const safe = encodeURIComponent(resolvePostAuthCallbackUrl(returnTo))
    redirect(`/sign-in?callbackUrl=${safe}` as Route)
  }

  if (!session.user.emailVerified) {
    redirect(`/account/identity?notice=verify-email` as Route)
  }
}
