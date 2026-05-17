import { GovernedEmpty } from "#features/governed-surface"
import { parseEmptyStateData } from "#features/governed-surface/schemas/list-surface.schema"

/**
 * governed:empty — standalone empty / error / forbidden state.
 */
export function EmptyRenderer({ configuration }: { configuration: unknown }) {
  const parsed = parseEmptyStateData(configuration)
  if (!parsed.success) {
    return null
  }
  return <GovernedEmpty model={parsed.data} />
}
