import "server-only"

import { count, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { customers } from "#lib/db/schema"
import type { ContactRow } from "#features/contacts/types"

/** Tenant-scoped count — call only after `requireOrgSession()` (or equivalent). */
export async function countContactsForOrganization(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
  return Number(row?.n ?? 0)
}

/** Recent contacts (newest first) — call only after `requireOrgSession()` (or equivalent). */
export async function listRecentContactsForOrganization(
  organizationId: string,
  limit: number
): Promise<ContactRow[]> {
  return db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(desc(customers.createdAt))
    .limit(limit)
}

/** Tenant-scoped listing — call only after `requireOrgSession()` (or equivalent). */
export async function listContactsForOrganization(
  organizationId: string
): Promise<ContactRow[]> {
  return db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(desc(customers.createdAt))
}
