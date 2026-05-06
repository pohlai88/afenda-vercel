import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { member } from "#lib/db/schema"

/**
 * Better Auth organization plugin built-in roles (lowest → highest).
 * Custom org role strings not in this map rank as `0` for comparisons.
 */
const ORG_ROLE_RANK = {
  member: 1,
  admin: 2,
  owner: 3,
} as const

export type OrgRoleMinimum = keyof typeof ORG_ROLE_RANK

function parseBetterAuthAdminUserIdsFromEnv(): string[] {
  const raw = process.env.BETTER_AUTH_ADMIN_USER_IDS?.trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Global Better Auth admin: `admin` appears in the user's `role` field (comma-separated)
 * or the user id is listed in `BETTER_AUTH_ADMIN_USER_IDS`.
 * Must stay aligned with `requireGlobalAdminSession` in `lib/tenant.ts`.
 */
export function isGlobalAdminUser(
  userId: string,
  userRole: string | null | undefined
): boolean {
  const roles = String(userRole ?? "user")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
  if (roles.includes("admin")) return true
  return parseBetterAuthAdminUserIdsFromEnv().includes(userId)
}

export function orgRoleRank(role: string | null | undefined): number {
  if (!role) return 0
  const key = role.trim().toLowerCase() as OrgRoleMinimum
  return key in ORG_ROLE_RANK ? ORG_ROLE_RANK[key] : 0
}

/** True if `actual` is at least `minimum` in the built-in org role ordering. */
export function orgRoleAtLeast(
  actual: string | null | undefined,
  minimum: OrgRoleMinimum
): boolean {
  return orgRoleRank(actual) >= ORG_ROLE_RANK[minimum]
}

/** Organization membership role for a user, or `null` if not a member. */
export async function getOrgMemberRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId))
    )
    .limit(1)
  return row?.role ?? null
}

/**
 * Global admins bypass org role checks. Otherwise requires org membership at or above `minimum`.
 */
export async function canActInOrganization(
  userId: string,
  userRole: string | null | undefined,
  organizationId: string,
  minimum: OrgRoleMinimum
): Promise<boolean> {
  if (isGlobalAdminUser(userId, userRole)) return true
  const r = await getOrgMemberRole(userId, organizationId)
  return orgRoleAtLeast(r, minimum)
}
