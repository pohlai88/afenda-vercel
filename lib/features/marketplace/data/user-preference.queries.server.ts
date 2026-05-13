import "server-only"

import { cache } from "react"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { userCapabilityPreference } from "#lib/db/schema"

import type { PreferenceState, UserCapabilityPreferenceRow } from "../types"

/**
 * Capability Registry — read path for `user_capability_preference`.
 *
 * Wrapped in `React.cache` so multiple RSC subtrees in the same
 * request that read the same `(organizationId, userId)` pair share
 * one SELECT (utility-bar resolver + marketplace overview).
 *
 * **IDOR contract.** The query is keyed on `(organizationId,
 * userId)` from a validated session. Callers MUST pass values from
 * `requireOrgSession` — never from request input.
 */

const PREFERENCE_STATES = new Set<PreferenceState>(["visible", "hidden"])

export const listUserCapabilityPreferences = cache(
  async (input: {
    organizationId: string
    userId: string
  }): Promise<UserCapabilityPreferenceRow[]> => {
    const rows = await db
      .select({
        id: userCapabilityPreference.id,
        capabilityId: userCapabilityPreference.capabilityId,
        state: userCapabilityPreference.state,
        displayOrder: userCapabilityPreference.displayOrder,
        updatedAt: userCapabilityPreference.updatedAt,
      })
      .from(userCapabilityPreference)
      .where(
        and(
          eq(userCapabilityPreference.organizationId, input.organizationId),
          eq(userCapabilityPreference.userId, input.userId)
        )
      )
      .orderBy(
        asc(userCapabilityPreference.displayOrder),
        asc(userCapabilityPreference.id)
      )

    const out: UserCapabilityPreferenceRow[] = []
    for (const row of rows) {
      if (!PREFERENCE_STATES.has(row.state as PreferenceState)) continue
      out.push({
        id: row.id,
        capabilityId: row.capabilityId,
        state: row.state as PreferenceState,
        displayOrder: row.displayOrder,
        updatedAt: row.updatedAt,
      })
    }
    return out
  }
)

/**
 * Distinct users with a `visible` preference for a single
 * capability across the chain. Feeds the chain-wide metrics strip.
 */
export async function countUserPreferencesByCapability(input: {
  capabilityId: string
  state: PreferenceState
}): Promise<number> {
  const rows = await db
    .selectDistinct({ userId: userCapabilityPreference.userId })
    .from(userCapabilityPreference)
    .where(
      and(
        eq(userCapabilityPreference.capabilityId, input.capabilityId),
        eq(userCapabilityPreference.state, input.state)
      )
    )
  return rows.length
}

/**
 * Distinct organizations with at least one user who has set a
 * `visible` preference for the capability. Used to derive the
 * "adopting orgs" metric distinct from `countOrgPoliciesByCapability`
 * (which counts orgs whose admin explicitly allowed/mandated it).
 */
export async function countOrgsAdoptingCapability(input: {
  capabilityId: string
}): Promise<number> {
  const rows = await db
    .selectDistinct({
      organizationId: userCapabilityPreference.organizationId,
    })
    .from(userCapabilityPreference)
    .where(
      and(
        eq(userCapabilityPreference.capabilityId, input.capabilityId),
        eq(userCapabilityPreference.state, "visible")
      )
    )
  return rows.length
}
