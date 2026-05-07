import "server-only"

import { desc, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { member, organization } from "#lib/db/schema"

import type { PlatformAdminOrganizationSummary } from "../types"

/**
 * Cross-tenant directory of organizations with member counts. Reserved for
 * platform-admin callers — organization-scoped UIs must use org-scoped queries.
 */
export async function listOrganizationsForPlatformAdmin(): Promise<
  PlatformAdminOrganizationSummary[]
> {
  const memberCount = sql<number>`count(${member.id})::int`.as("member_count")

  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      memberCount,
    })
    .from(organization)
    .leftJoin(member, eq(member.organizationId, organization.id))
    .groupBy(organization.id)
    .orderBy(desc(organization.createdAt))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    memberCount: row.memberCount ?? 0,
  }))
}
