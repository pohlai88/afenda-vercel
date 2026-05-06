import "server-only"

import { and, eq, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import { account } from "#lib/db/schema"

export type SafeLinkedAccount = {
  id: string
  providerId: string
  accountId: string
  createdAt: Date
  isCredentialAccount: boolean
}

/** Linked OAuth / credential rows without token fields (UI + identity page). */
export async function listSafeLinkedAccounts(userId: string): Promise<SafeLinkedAccount[]> {
  const rows = await db
    .select({
      id: account.id,
      providerId: account.providerId,
      accountId: account.accountId,
      createdAt: account.createdAt,
    })
    .from(account)
    .where(eq(account.userId, userId))

  return rows.map((row) => ({
    ...row,
    isCredentialAccount: row.providerId === "credential",
  }))
}

export async function hasCredentialAccount(userId: string): Promise<boolean> {
  const row = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), isNotNull(account.password)))
    .limit(1)
  return row.length > 0
}

/** Social providers configured in env (matches `socialProviders()` in config). */
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
