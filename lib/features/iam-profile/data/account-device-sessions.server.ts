import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { desc, eq } from "drizzle-orm"

import { auth } from "#lib/auth"
import { db } from "#lib/db"
import { neonAuthSession } from "#lib/db/schema-neon-auth"

/** Active sessions for the current user (`neon_auth.session` rows). */
export const listDeviceSessions = cache(async () => {
  const { data } = await auth.getSession({
    fetchOptions: { headers: await headers() },
  })
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
