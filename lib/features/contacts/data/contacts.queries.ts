import "server-only"

import { desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { customers } from "#lib/db/schema"
import type { ContactRow } from "#features/contacts/types"

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
