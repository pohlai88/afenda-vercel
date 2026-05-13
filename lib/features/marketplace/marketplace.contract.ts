import { ORG_ADMIN_EVENT_NAMESPACES } from "#features/org-admin/client"

/**
 * Capability Registry — public audit + category contract.
 *
 * Single source of truth shared by the resolver, the Server Actions,
 * the contract test, and any future log drain / dashboards. Imports
 * this file MUST stay free of `server-only` so contract tests can
 * snapshot it from a Node-only Vitest run.
 *
 * Doctrine — `iam.workbench.*` is the personal-state namespace
 * (operator preference); `org.capability.*` is the governance
 * namespace (admin policy). Both prefixes are inside the existing
 * `ORG_ADMIN_EVENT_NAMESPACES` allowlist, so no contract-script
 * change is required to add a new verb here.
 */

// ---------------------------------------------------------------------------
// Capability categories — registry vocabulary
// ---------------------------------------------------------------------------

/**
 * The seven Marketplace categories. Only `utilities` ships with real
 * data and full UI in v1; the other six register so the empty-state
 * route can render a calm placeholder without touching the resolver
 * or the catalog adapter. New categories register here, then route
 * pages + i18n keys follow.
 *
 * Order is the canonical browse order (left-to-right in the category
 * nav). Mutating order is a UX change, not a refactor.
 */
export const CAPABILITY_CATEGORIES = [
  "utilities",
  "plugins",
  "mcp",
  "integrations",
  "automations",
  "operators",
  "surfaces",
] as const

export type CapabilityCategory = (typeof CAPABILITY_CATEGORIES)[number]

const CATEGORY_SET = new Set<string>(CAPABILITY_CATEGORIES)

export function isCapabilityCategory(
  value: string
): value is CapabilityCategory {
  return CATEGORY_SET.has(value)
}

// ---------------------------------------------------------------------------
// Audit action grammar — stable strings (public contract)
// ---------------------------------------------------------------------------

/**
 * Canonical IAM audit action strings emitted by the marketplace
 * Server Actions. Single source of truth for writers, contract
 * tests, log drains, and AGENTS.md examples.
 *
 *   `iam.workbench.capability.preference.set`   — Tier B; user preference
 *                                                 visible/hidden override
 *   `org.capability.policy.set`                 — Tier A admin; allowed/blocked/mandatory
 *   `org.capability.policy.delete`              — Tier A admin; reset to system default
 */
export const MARKETPLACE_AUDIT_ACTIONS = {
  USER_PREFERENCE_SET: "iam.workbench.capability.preference.set",
  ORG_POLICY_SET: "org.capability.policy.set",
  ORG_POLICY_DELETE: "org.capability.policy.delete",
} as const

export type MarketplaceAuditAction =
  (typeof MARKETPLACE_AUDIT_ACTIONS)[keyof typeof MARKETPLACE_AUDIT_ACTIONS]

/**
 * Resource types written into `iam_audit_event.resourceType`. Mirrors
 * the Drizzle table names so log drains can join back to the row that
 * the audit references.
 */
export const MARKETPLACE_RESOURCE_TYPES = {
  USER_PREFERENCE: "user_capability_preference",
  ORG_POLICY: "org_capability_policy",
} as const

export type MarketplaceResourceType =
  (typeof MARKETPLACE_RESOURCE_TYPES)[keyof typeof MARKETPLACE_RESOURCE_TYPES]

/**
 * Verifies every marketplace audit string starts with one of the
 * canonical event namespaces. The contract test calls this against
 * `MARKETPLACE_AUDIT_ACTIONS` so a future drift here fails CI rather
 * than landing as silently broken audit rows.
 */
export function marketplaceAuditPrefixIsRegistered(action: string): boolean {
  const dot = action.indexOf(".")
  if (dot <= 0) return false
  const namespace = action.slice(
    0,
    dot
  ) as (typeof ORG_ADMIN_EVENT_NAMESPACES)[number]
  return (ORG_ADMIN_EVENT_NAMESPACES as readonly string[]).includes(namespace)
}
