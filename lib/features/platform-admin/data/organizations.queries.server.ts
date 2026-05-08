import "server-only"

import { desc, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember, neonAuthOrganization } from "#lib/db/schema-neon-auth"

import type { PlatformAdminOrganizationSummary } from "../types"

/**
 * Cross-tenant directory of organizations with member counts. Reserved for
 * platform-admin callers — organization-scoped UIs must use org-scoped queries.
 */
export async function listOrganizationsForPlatformAdmin(): Promise<
  PlatformAdminOrganizationSummary[]
> {
  const memberCount = sql<number>`count(${neonAuthMember.id})::int`.as(
    "member_count"
  )

  const rows = await db
    .select({
      id: neonAuthOrganization.id,
      name: neonAuthOrganization.name,
      slug: neonAuthOrganization.slug,
      createdAt: neonAuthOrganization.createdAt,
      memberCount,
    })
    .from(neonAuthOrganization)
    .leftJoin(
      neonAuthMember,
      eq(neonAuthMember.organizationId, neonAuthOrganization.id)
    )
    .groupBy(neonAuthOrganization.id)
    .orderBy(desc(neonAuthOrganization.createdAt))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    memberCount: row.memberCount ?? 0,
  }))
}
