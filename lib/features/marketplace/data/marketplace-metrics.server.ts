import "server-only"

import { unstable_cache } from "next/cache"

import {
  MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD,
  MARKETPLACE_METRICS_REVALIDATE_SECONDS,
} from "../constants"
import type { CapabilityChainMetrics } from "../types"
import { countOrgPoliciesByCapability } from "./org-policy.queries.server"
import {
  countOrgsAdoptingCapability,
  countUserPreferencesByCapability,
} from "./user-preference.queries.server"

/**
 * Capability Registry — chain-wide adoption metrics.
 *
 * Cached with `unstable_cache` keyed on the capability id. Cache
 * tag is `marketplace:metrics:<capabilityId>` so the org-policy
 * Server Action can bust per-capability metrics with one
 * `revalidateTag` call.
 *
 * **k-anonymity gate.** Counts below
 * `MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD` resolve to `null`
 * so a single-tenant outlier cannot be re-identified from the
 * Marketplace surface. The UI renders an em-dash for `null`
 * counts; downstream callers MUST NOT round or extrapolate.
 *
 * Doctrinal — these counts are aggregated only. The function
 * never returns per-org or per-user breakdowns; building one
 * would require a separate authority gate (platform admin, not
 * org admin) and is intentionally out of v1 scope.
 */

export const CAPABILITY_METRICS_TAG_PREFIX = "marketplace:metrics:" as const

export function capabilityMetricsTag(capabilityId: string): string {
  return `${CAPABILITY_METRICS_TAG_PREFIX}${capabilityId}`
}

/**
 * Stable shared tag — useful for "bust everything" scenarios from
 * a future scheduled job. Per-capability tag is the normal path.
 */
export const CAPABILITY_METRICS_TAG = "marketplace:metrics" as const

function gateForKAnonymity(value: number): number | null {
  if (value < MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD) return null
  return value
}

async function readMetricsUncached(
  capabilityId: string
): Promise<CapabilityChainMetrics> {
  const [adoptingUsersRaw, adoptingOrgsRaw, allowingOrgsRaw] =
    await Promise.all([
      countUserPreferencesByCapability({ capabilityId, state: "visible" }),
      countOrgsAdoptingCapability({ capabilityId }),
      countOrgPoliciesByCapability({ capabilityId }),
    ])
  return {
    capabilityId,
    adoptingUsers: gateForKAnonymity(adoptingUsersRaw),
    adoptingOrgs: gateForKAnonymity(adoptingOrgsRaw),
    allowingOrgs: gateForKAnonymity(allowingOrgsRaw),
    kAnonymityThreshold: MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD,
  }
}

/**
 * Returns chain-wide adoption metrics for a single capability.
 * Cached for `MARKETPLACE_METRICS_REVALIDATE_SECONDS` and tagged
 * `marketplace:metrics:<id>` for explicit invalidation from the
 * org-policy Server Action.
 */
export async function getCapabilityChainMetrics(
  capabilityId: string
): Promise<CapabilityChainMetrics> {
  const tag = capabilityMetricsTag(capabilityId)
  const fetcher = unstable_cache(
    () => readMetricsUncached(capabilityId),
    ["marketplace-metrics", capabilityId],
    {
      revalidate: MARKETPLACE_METRICS_REVALIDATE_SECONDS,
      tags: [tag, CAPABILITY_METRICS_TAG],
    }
  )
  return await fetcher()
}
