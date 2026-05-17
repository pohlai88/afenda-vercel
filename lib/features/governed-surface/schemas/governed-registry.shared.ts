import type { GovernedComponentRegistry } from "./component-registry.schema"

/**
 * Merges module-scoped registry slices into a single lookup table.
 * Duplicate keys are a programming error — two modules cannot claim
 * the same component type. Throws on conflict in all environments.
 */
export function mergeGovernedRegistries(
  ...registries: readonly GovernedComponentRegistry[]
): GovernedComponentRegistry {
  const merged: Record<string, string> = {}

  for (const registry of registries) {
    for (const [key, value] of Object.entries(registry)) {
      if (Object.prototype.hasOwnProperty.call(merged, key)) {
        throw new Error(
          `mergeGovernedRegistries: duplicate component type "${key}". Each component type may only be registered once.`
        )
      }

      merged[key] = value
    }
  }

  return merged
}
