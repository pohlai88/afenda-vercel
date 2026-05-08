import "server-only"

import { cache } from "react"
import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthSession } from "#lib/db/schema-neon-auth"

import { auth } from "./server"

/** Active sessions for the current user (Neon Auth `neon_auth.session` rows). */
export const listDeviceSessions = cache(async () => {
  const { data } = await auth.getSession()
  const userId = data?.user?.id
  if (!userId) return []

  return db
    .select({
      id: neonAuthSession.id,
      token: neonAuthSession.token,
      createdAt: neonAuthSession.createdAt,
      expiresAt: neonAuthSession.expiresAt,
      ipAddress: neonAuthSession.ipAddress,
      userAgent: neonAuthSession.userAgent,
    })
    .from(neonAuthSession)
    .where(eq(neonAuthSession.userId, userId))
    .orderBy(desc(neonAuthSession.createdAt))
})

/**
 * Passkeys are not wired for Neon Auth V2 yet; returns an empty list so security UIs can render.
 */
export const listUserPasskeys = cache(async () => [] as never[])
