import "server-only"

import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { customers } from "#lib/db/schema"

/** Tenant-scoped listing — call only after `requireOrgSession()` (or equivalent). */
export async function listCustomersForOrganization(organizationId: string) {
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

export type CustomerRow = Awaited<
  ReturnType<typeof listCustomersForOrganization>
>[number]
