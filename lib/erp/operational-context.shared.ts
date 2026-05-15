/**
 * Shared type contract for ERP Operational Context.
 *
 * Intentionally DB-free and feature-free — only plain TypeScript types.
 * Consumed by lib/erp/with-operational-context.server.ts, lib/erp/audit-7w1h,
 * RouteEnvelope, and lib/features/operational-scope/server.ts (which owns the
 * resolver logic and all DB access).
 *
 * See ADR-0019.
 */

/** Who resolved this scope into the context — determines render badge and write gate. */
export type OperationalScopeSource =
  | "route"
  | "workflow"
  | "user"
  | "policy"
  | "default"

/** Who may change this scope's selection — controls pill interactivity. */
export type OperationalScopeAuthority = "user" | "admin" | "system"

/**
 * One resolved dimension of the operational context (e.g. the current project,
 * the current period, the current team). A `ResolvedOperationalContext` contains
 * zero or more of these, keyed by `scopeType`.
 */
export type ResolvedOperationalScope = {
  scopeType: string
  selectedId: string | null
  selectedLabel: string | null
  selectedSlug: string | null
  /** Which layer of the precedence cascade supplied this scope. */
  source: OperationalScopeSource
  /** Which governance tier may mutate this scope's selection. */
  authority: OperationalScopeAuthority
  /** True = user has pinned this scope; it renders in the rail even without a selection. */
  pinned: boolean
  displayOrder: number
}

/**
 * Full resolved operational context for a single (organization, user) pair.
 * Built by resolveOperationalContext() in lib/features/operational-scope/server.ts
 * and attached to RouteEnvelope so layouts, client components, and audit helpers
 * can consume it without re-fetching.
 */
export type ResolvedOperationalContext = {
  organizationId: string
  userId: string
  /** Keyed by scopeType for O(1) lookup at audit-enrichment time. */
  scopes: Record<string, ResolvedOperationalScope>
  /** ISO timestamp — tells clients how stale a cached context is. */
  resolvedAt: string
}
