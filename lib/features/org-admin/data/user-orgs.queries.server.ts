import "server-only"

import { cache } from "react"
import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember, neonAuthOrganization } from "#lib/db/schema-neon-auth"

import type { UserOrgSummary } from "../types"

/**
 * Returns all organizations the given user is a member of,
 * including the user's role in each organization.
 * Used by the org switcher and the `/console` cross-company landing page.
 *
 * Wrapped in `cache` so parallel RSC slots (`OrgSwitcherSlot`, `CommandPaletteSlot`)
 * share one DB round-trip per request.
 */
export const listUserOrganizationsForSwitcher = cache(
  async function listUserOrganizationsForSwitcher(
    userId: string
  ): Promise<UserOrgSummary[]> {
    const rows = await db
      .select({
        id: neonAuthOrganization.id,
        slug: neonAuthOrganization.slug,
        name: neonAuthOrganization.name,
        logo: neonAuthOrganization.logo,
        role: neonAuthMember.role,
      })
      .from(neonAuthMember)
      .innerJoin(
        neonAuthOrganization,
        eq(neonAuthMember.organizationId, neonAuthOrganization.id)
      )
      .where(eq(neonAuthMember.userId, userId))
      .orderBy(neonAuthOrganization.name)

    return rows
  }
)
