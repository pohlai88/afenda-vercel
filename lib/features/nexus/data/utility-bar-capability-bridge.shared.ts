import type { ResolvedCapabilitySet } from "#features/marketplace/client"

import type { UtilityBarItemId } from "#components2/stores/utility-bar-catalog.shared"

/** Maps Nexus utility `itemKey` → shell catalog id (kebab-case). */
const ITEM_KEY_TO_UTILITY_BAR_ID: Record<string, UtilityBarItemId> = {
  quickCreate: "quick-create",
  searchMobile: "search-mobile",
  notifications: "notifications",
  insight: "insight",
  theme: "theme",
  density: "density",
  locale: "locale",
  shortcuts: "shortcuts",
  feedback: "feedback",
  help: "help",
  settings: "settings",
  connectivity: "connectivity",
  storage: "storage",
  screenshot: "screenshot",
  upload: "upload",
  diagnosis: "diagnosis",
  messenger: "messenger",
  coordination: "coordination",
}

const UTILITY_BAR_ID_TO_CAPABILITY_ID: Record<UtilityBarItemId, string> =
  Object.fromEntries(
    Object.entries(ITEM_KEY_TO_UTILITY_BAR_ID).map(([itemKey, id]) => [
      id,
      `right.${itemKey}`,
    ])
  ) as Record<UtilityBarItemId, string>

export type UtilityBarRailSnapshot = {
  readonly visibleIds: readonly UtilityBarItemId[]
  readonly mandatoryIds: readonly UtilityBarItemId[]
}

export function utilityBarItemIdFromCapabilityId(
  capabilityId: string
): UtilityBarItemId | null {
  const entry = Object.entries(ITEM_KEY_TO_UTILITY_BAR_ID).find(
    ([itemKey]) => capabilityId === `right.${itemKey}`
  )
  return entry ? entry[1] : null
}

export function capabilityIdFromUtilityBarItemId(
  itemId: UtilityBarItemId
): string {
  return UTILITY_BAR_ID_TO_CAPABILITY_ID[itemId]
}

export function toUtilityBarRailSnapshot(
  resolved: ResolvedCapabilitySet
): UtilityBarRailSnapshot {
  const visibleIds: UtilityBarItemId[] = []
  const mandatoryIds: UtilityBarItemId[] = []

  for (const capabilityId of resolved.visibleIds) {
    const itemId = utilityBarItemIdFromCapabilityId(capabilityId)
    if (itemId) visibleIds.push(itemId)
  }

  for (const capabilityId of resolved.mandatoryIds) {
    const itemId = utilityBarItemIdFromCapabilityId(capabilityId)
    if (itemId) mandatoryIds.push(itemId)
  }

  return { visibleIds, mandatoryIds }
}

export type UtilityBarCapabilityRow = {
  readonly capabilityId: string
  readonly utilityBarItemId: UtilityBarItemId
  readonly effective: ResolvedCapabilitySet["resolved"][number]["effective"]
  readonly customizable: boolean
}

export function toUtilityBarCapabilityRows(
  resolved: ResolvedCapabilitySet
): UtilityBarCapabilityRow[] {
  const rows: UtilityBarCapabilityRow[] = []
  for (const entry of resolved.resolved) {
    const utilityBarItemId = utilityBarItemIdFromCapabilityId(
      entry.definition.id
    )
    if (!utilityBarItemId) continue
    rows.push({
      capabilityId: entry.definition.id,
      utilityBarItemId,
      effective: entry.effective,
      customizable: entry.definition.customizable,
    })
  }
  return rows
}
