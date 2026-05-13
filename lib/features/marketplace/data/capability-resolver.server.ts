import "server-only"

import { MARKETPLACE_RAIL_VISIBLE_LIMIT } from "../constants"
import { getCapabilityDefinitions } from "./capability-catalog.shared"
import type {
  CapabilityDefinition,
  CapabilityViewerContext,
  OrgCapabilityPolicyRow,
  ResolvedCapability,
  ResolvedCapabilitySet,
  ResolvedEffectiveState,
  ResolvedSource,
  UserCapabilityPreferenceRow,
} from "../types"

/**
 * Capability Registry — single layered policy resolver.
 *
 * Resolution order (top wins):
 *
 *   1. Runtime gates (`adminOnly | mobileOnly | multiOrgOnly | multiLocaleOnly`)
 *      — fail closed. A capability whose runtime gate is unmet is `unavailable`
 *      regardless of policy or preference. This stops a future "force-enable"
 *      bug from leaking an admin-only icon to non-admin viewers.
 *
 *   2. Org policy (audience-filtered).
 *      `mandatory` and `blocked` are terminal; user preferences cannot override
 *      them. The audience layer is the role-policy collapse: a row with
 *      `audience = 'admin'` only fires when `viewer.isAdmin` is true.
 *      `member` only fires when the viewer is *not* an admin. `all` always
 *      applies. `mandatory` beats `blocked` when both apply (escalation
 *      precedence — admins explicitly mandating a capability override a
 *      previously-blocked one).
 *
 *   3. User preference. Overrides system default but never `mandatory` /
 *      `blocked`. Absent → fall through to system default.
 *
 *   4. System default (`definition.defaultVisible`). Final answer when no
 *      higher layer fires.
 *
 * After per-capability resolution, the rail visible-list is built by:
 *
 *   - Collecting every entry whose `effective` is `mandatory` or `visible`,
 *   - Sorting by `definition.priority` (lower wins), and
 *   - Truncating to `MARKETPLACE_RAIL_VISIBLE_LIMIT` (the L1 9-icon cap).
 *
 * `mandatory` items count toward the cap so an admin who mandates more
 * than 9 capabilities still sees a stable rail; the truncation policy is
 * "highest priority wins" for both visible and mandatory.
 */

export type ResolveInput = {
  readonly viewer: CapabilityViewerContext
  readonly orgPolicy: readonly OrgCapabilityPolicyRow[]
  readonly userPreferences: readonly UserCapabilityPreferenceRow[]
  /**
   * Optional override for the catalog. Defaults to every registered
   * capability across all categories. Tests inject a small subset to
   * exercise edge cases without mocking the catalog adapter.
   */
  readonly definitions?: readonly CapabilityDefinition[]
}

// ---------------------------------------------------------------------------
// Runtime gates
// ---------------------------------------------------------------------------

function passesRuntimeGates(
  definition: CapabilityDefinition,
  viewer: CapabilityViewerContext
): boolean {
  const gates = definition.runtimeGates
  if (gates.adminOnly && !viewer.isAdmin) return false
  if (gates.mobileOnly && !viewer.isMobile) return false
  if (gates.multiOrgOnly && !viewer.multiOrg) return false
  if (gates.multiLocaleOnly && !viewer.multiLocale) return false
  return true
}

// ---------------------------------------------------------------------------
// Audience filter
// ---------------------------------------------------------------------------

function policyAppliesToViewer(
  row: OrgCapabilityPolicyRow,
  viewer: CapabilityViewerContext
): boolean {
  if (row.audience === "all") return true
  if (row.audience === "admin") return viewer.isAdmin
  if (row.audience === "member") return !viewer.isAdmin
  return false
}

// ---------------------------------------------------------------------------
// Per-capability resolution
// ---------------------------------------------------------------------------

function resolveOne(
  definition: CapabilityDefinition,
  viewer: CapabilityViewerContext,
  orgPolicy: readonly OrgCapabilityPolicyRow[],
  userPreferences: readonly UserCapabilityPreferenceRow[]
): ResolvedCapability {
  // Layer 1 — runtime gates (fail closed).
  if (!passesRuntimeGates(definition, viewer)) {
    return {
      definition,
      effective: "unavailable",
      source: "runtime",
      reason: "runtime-gate-unmet",
    }
  }

  // Layer 2 — org policy. Mandatory beats blocked when both apply.
  const policiesForCapability = orgPolicy.filter(
    (row) =>
      row.capabilityId === definition.id && policyAppliesToViewer(row, viewer)
  )

  let mandatory: OrgCapabilityPolicyRow | null = null
  let blocked: OrgCapabilityPolicyRow | null = null
  for (const row of policiesForCapability) {
    if (row.state === "mandatory" && !mandatory) mandatory = row
    if (row.state === "blocked" && !blocked) blocked = row
  }

  if (mandatory) {
    return assemble(
      definition,
      "mandatory",
      "org-policy",
      "org-policy-mandatory"
    )
  }
  if (blocked) {
    return assemble(definition, "hidden", "org-policy", "org-policy-blocked")
  }

  // Layer 3 — user preference (only fires when org policy did not).
  const preference = userPreferences.find(
    (row) => row.capabilityId === definition.id
  )
  if (preference) {
    if (preference.state === "hidden") {
      return assemble(definition, "hidden", "user-preference", "user-hidden")
    }
    if (preference.state === "visible") {
      return assemble(definition, "visible", "user-preference", "user-visible")
    }
  }

  // Layer 4 — system default.
  return assemble(
    definition,
    definition.defaultVisible ? "visible" : "hidden",
    "system-default",
    definition.defaultVisible
      ? "system-default-visible"
      : "system-default-hidden"
  )
}

function assemble(
  definition: CapabilityDefinition,
  effective: ResolvedEffectiveState,
  source: ResolvedSource,
  reason: string
): ResolvedCapability {
  return { definition, effective, source, reason }
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/**
 * Resolves every catalog entry for one viewer in one organization and
 * returns the capped, priority-sorted visible-id list for the L1
 * utility rail.
 *
 * Pure function — no IO, safe to call from tests with hand-built
 * inputs. The Server Components / route layouts at call sites are
 * the ones responsible for fetching the policy + preference rows
 * via `listOrgCapabilityPolicy` / `listUserCapabilityPreferences`.
 */
export function resolveCapabilitiesForViewer(
  input: ResolveInput
): ResolvedCapabilitySet {
  const definitions = input.definitions ?? getCapabilityDefinitions()
  const resolved: ResolvedCapability[] = []
  for (const definition of definitions) {
    resolved.push(
      resolveOne(
        definition,
        input.viewer,
        input.orgPolicy,
        input.userPreferences
      )
    )
  }

  // Highest-priority visible / mandatory wins; cap at the rail limit.
  const renderable = resolved
    .filter(
      (entry) =>
        entry.effective === "mandatory" || entry.effective === "visible"
    )
    .sort((a, b) => a.definition.priority - b.definition.priority)
    .slice(0, MARKETPLACE_RAIL_VISIBLE_LIMIT)

  const visibleIds: string[] = []
  const mandatoryIds: string[] = []
  for (const entry of renderable) {
    visibleIds.push(entry.definition.id)
    if (entry.effective === "mandatory") {
      mandatoryIds.push(entry.definition.id)
    }
  }

  return {
    resolved,
    visibleIds,
    mandatoryIds,
  }
}
