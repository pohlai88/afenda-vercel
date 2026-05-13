import "server-only"

import { cache } from "react"

import { and, eq, sql, type SQL } from "drizzle-orm"

import { db } from "#lib/db"
import { orgCapabilityPolicy } from "#lib/db/schema"

import type {
  OrgCapabilityPolicyRow,
  PolicyAudience,
  PolicyState,
} from "../types"

import { isCapabilityRegistryRelationMissing } from "./capability-registry-read-fallback.shared"

/**
 * Capability Registry — read path for `org_capability_policy`.
 *
 * The resolver consumes the full org policy set (one row per
 * (capability, audience)). Wrapped in `React.cache` so any RSC
 * subtree that reads the same `organizationId` inside the same
 * request shares a single SELECT — the L1 utility-bar resolver +
 * the marketplace overview / admin panels would otherwise each
 * issue an identical query.
 */

const POLICY_STATES = new Set<PolicyState>(["allowed", "blocked", "mandatory"])
const POLICY_AUDIENCES = new Set<PolicyAudience>(["all", "admin", "member"])

function rowToDto(row: {
  id: string
  capabilityId: string
  state: string
  audience: string
  updatedBy: string
  updatedAt: Date
}): OrgCapabilityPolicyRow | null {
  // Self-healing: rows whose `state` / `audience` drift outside the
  // canonical sets are silently dropped from the resolver input.
  if (!POLICY_STATES.has(row.state as PolicyState)) return null
  if (!POLICY_AUDIENCES.has(row.audience as PolicyAudience)) return null
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    state: row.state as PolicyState,
    audience: row.audience as PolicyAudience,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
  }
}

type OrgPolicySelectRow = {
  id: string
  capabilityId: string
  state: string
  audience: string
  updatedBy: string
  updatedAt: Date
}

export const listOrgCapabilityPolicy = cache(
  async (organizationId: string): Promise<OrgCapabilityPolicyRow[]> => {
    let rows: OrgPolicySelectRow[]
    try {
      rows = await db
        .select({
          id: orgCapabilityPolicy.id,
          capabilityId: orgCapabilityPolicy.capabilityId,
          state: orgCapabilityPolicy.state,
          audience: orgCapabilityPolicy.audience,
          updatedBy: orgCapabilityPolicy.updatedBy,
          updatedAt: orgCapabilityPolicy.updatedAt,
        })
        .from(orgCapabilityPolicy)
        .where(eq(orgCapabilityPolicy.organizationId, organizationId))
    } catch (err) {
      if (isCapabilityRegistryRelationMissing(err)) return []
      throw err
    }

    const out: OrgCapabilityPolicyRow[] = []
    for (const row of rows) {
      const dto = rowToDto(row)
      if (dto) out.push(dto)
    }
    return out
  }
)

/**
 * Aggregated counts of org policies for a single capability across
 * the chain — feeds the chain-wide metrics strip. Returns the count
 * of distinct organizations whose policy explicitly allows or
 * mandates the capability (blocked rows are intentionally excluded).
 */
export async function countOrgPoliciesByCapability(input: {
  capabilityId: string
}): Promise<number> {
  const allowedOrMandatory: SQL = sql`${orgCapabilityPolicy.state} IN ('allowed', 'mandatory')`
  let rows: { organizationId: string }[]
  try {
    rows = await db
      .selectDistinct({ organizationId: orgCapabilityPolicy.organizationId })
      .from(orgCapabilityPolicy)
      .where(
        and(
          eq(orgCapabilityPolicy.capabilityId, input.capabilityId),
          allowedOrMandatory
        )
      )
  } catch (err) {
    if (isCapabilityRegistryRelationMissing(err)) return 0
    throw err
  }
  return rows.length
}
