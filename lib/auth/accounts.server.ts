import "server-only"

import { and, eq, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthAccount } from "#lib/db/schema-neon-auth"

import type { SafeLinkedAccount } from "./accounts.types.shared"

export type { SafeLinkedAccount } from "./accounts.types.shared"

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

/** Social providers configured in env (parity with legacy Better Auth env names). */
export function getEnabledSocialProviderIds(): string[] {
  const ids: string[] = []
  const ghId =
    process.env.GITHUB_CLIENT_ID?.trim() ||
    process.env.BETTER_AUTH_GITHUB_CLIENT_ID?.trim()
  const ghSecret =
    process.env.GITHUB_CLIENT_SECRET?.trim() ||
    process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET?.trim()
  if (ghId && ghSecret) ids.push("github")

  const gId =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.BETTER_AUTH_GOOGLE_CLIENT_ID?.trim()
  const gSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET?.trim()
  if (gId && gSecret) ids.push("google")

  return ids
}
