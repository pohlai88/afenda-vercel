import "server-only"

import { eq } from "drizzle-orm"

import { AUTH_STATUS } from "#lib/auth/auth-status.shared"
import { isSessionFresh } from "#lib/auth/session-policy.server"
import { db } from "#lib/db"
import { neonAuthSession } from "#lib/db/schema-neon-auth"

import { auth } from "./server"
import { redirectToAuthInterruptionV2 } from "./interruption-redirect.server"

export async function requireRecentAuthStepUp(options: {
  returnTo: string
}): Promise<void> {
  const { data } = await auth.getSession()
  if (!data?.session?.id) {
    await redirectToAuthInterruptionV2(AUTH_STATUS.SESSION_EXPIRED, {
      callbackPath: options.returnTo,
    })
  }

  const frag = data!.session as {
    createdAt?: Date | string | null
  }
  let createdAt: Date | string | null | undefined = frag.createdAt
  if (createdAt == null) {
    const [row] = await db
      .select({ createdAt: neonAuthSession.createdAt })
      .from(neonAuthSession)
      .where(eq(neonAuthSession.id, data!.session!.id))
      .limit(1)
    createdAt = row?.createdAt ?? null
  }

  if (!isSessionFresh({ createdAt })) {
    await redirectToAuthInterruptionV2(AUTH_STATUS.STEP_UP_REQUIRED, {
      callbackPath: options.returnTo,
    })
  }
}
