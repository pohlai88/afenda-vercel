/**
 * ERP Operational Scope Registry.
 *
 * A mutable singleton Map that ERP feature modules populate from their server.ts
 * barrels. The resolver (lib/features/operational-scope/server.ts) reads from it
 * at request time to validate scopeType values, auto-resolve route segments, and
 * supply icon + label metadata to the UI without extra DB queries.
 *
 * Rules:
 * - Registrations happen once, at module load time (side-effect imports).
 * - No feature may import from another feature to register it — each module
 *   registers its own scopes from its own server.ts barrel.
 * - lib/erp/ may not import this file into feature-aware modules; features import
 *   this file, never the reverse.
 *
 * See ADR-0019.
 */

export type OperationalScopeDefinition = {
  /** Stable identifier — matches the DB `scopeType` column. */
  scopeType: string
  /** Human-readable label for admin config UI. */
  label: string
  /** Lucide icon name string. */
  iconName: string
  /** Which ERP module owns this scope type (lineage only, not a routing concern). */
  module: string
  /**
   * True = active and selectable in the org admin config UI.
   * False = reserved; shows as disabled in the admin list.
   */
  available: boolean
  /**
   * If provided, the resolver calls this with the current route segments and
   * returns the `selectedId` (or null) without needing a user or policy row.
   * Priority 1 in the precedence cascade.
   */
  routeMatcher?: (
    segments: ReadonlyArray<{ key: string; value: string }>
  ) => string | null
}

const _registry = new Map<string, OperationalScopeDefinition>()

/**
 * Register an operational scope definition. Call from a feature's server.ts barrel.
 * Re-registration with the same scopeType overwrites the previous definition.
 */
export function registerOperationalScope(
  def: OperationalScopeDefinition
): void {
  _registry.set(def.scopeType, def)
}

/**
 * Returns a read-only view of all registered scope definitions.
 * Sorted by registration order within each module.
 */
export function getRegisteredScopes(): ReadonlyMap<
  string,
  OperationalScopeDefinition
> {
  return _registry
}

/**
 * Returns the definition for a specific scopeType, or undefined if not registered.
 */
export function getOperationalScopeDefinition(
  scopeType: string
): OperationalScopeDefinition | undefined {
  return _registry.get(scopeType)
}

/**
 * True if scopeType is a registered, available (non-reserved) scope.
 * Use this for Zod `.refine()` at the Server Action write boundary.
 */
export function isValidScopeType(scopeType: string): boolean {
  return _registry.has(scopeType)
}
