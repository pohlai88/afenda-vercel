import "server-only"

import { and, eq, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthAccount } from "#lib/db/schema-neon-auth"

import type { SafeLinkedAccount } from "../schemas/accounts.types.shared"

export type { SafeLinkedAccount } from "../schemas/accounts.types.shared"

/** Linked OAuth / credential rows without token fields (UI + identity page). */
export async function listSafeLinkedAccounts(
  userId: string
): Promise<SafeLinkedAccount[]> {
  const rows = await db
    .select({
      id: neonAuthAccount.id,
      providerId: neonAuthAccount.providerId,
      accountId: neonAuthAccount.accountId,
      createdAt: neonAuthAccount.createdAt,
    })
    .from(neonAuthAccount)
    .where(eq(neonAuthAccount.userId, userId))

  return rows.map((row) => ({
    ...row,
    isCredentialAccount: row.providerId === "credential",
  }))
}

export async function hasCredentialAccount(userId: string): Promise<boolean> {
  const row = await db
    .select({ id: neonAuthAccount.id })
    .from(neonAuthAccount)
    .where(
      and(
        eq(neonAuthAccount.userId, userId),
        isNotNull(neonAuthAccount.password)
      )
    )
    .limit(1)
  return row.length > 0
}
