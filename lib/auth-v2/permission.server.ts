import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember } from "#lib/db/schema-neon-auth"

const ORG_ROLE_RANK = {
  member: 1,
  admin: 2,
  owner: 3,
} as const

export type OrgRoleMinimum = keyof typeof ORG_ROLE_RANK

function parseAdminUserIds(): string[] {
  const raw = process.env.BETTER_AUTH_ADMIN_USER_IDS?.trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isGlobalAdminUser(
  userId: string,
  userRole: string | null | undefined
): boolean {
  const roles = String(userRole ?? "user")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
  if (roles.includes("admin")) return true
  return parseAdminUserIds().includes(userId)
}

export function orgRoleRank(role: string | null | undefined): number {
  if (!role) return 0
  const key = role.trim().toLowerCase() as OrgRoleMinimum
  return key in ORG_ROLE_RANK ? ORG_ROLE_RANK[key] : 0
}

export function orgRoleAtLeast(
  actual: string | null | undefined,
  minimum: OrgRoleMinimum
): boolean {
  return orgRoleRank(actual) >= ORG_ROLE_RANK[minimum]
}

export async function getOrgMemberRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const [row] = await db
    .select({ role: neonAuthMember.role })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.userId, userId),
        eq(neonAuthMember.organizationId, organizationId)
      )
    )
    .limit(1)
  return row?.role ?? null
}

export async function canActInOrganization(
  userId: string,
  userRole: string | null | undefined,
  organizationId: string,
  minimum: OrgRoleMinimum
): Promise<boolean> {
  if (isGlobalAdminUser(userId, userRole)) return true
  const role = await getOrgMemberRole(userId, organizationId)
  return orgRoleAtLeast(role, minimum)
}
