import {
  NEXUS_RIGHT_RAIL_VISIBLE_LIMIT,
  NEXUS_UTILITY_CATALOG,
  isInstalledNexusRightUtilityWidgetId,
  isNexusRightUtilityAvailable,
  type NexusRightUtilityAvailabilityContext,
  type NexusRightUtilityWidgetId,
  type NexusUtilityCatalogEntry,
} from "#features/nexus"

import type {
  NexusUtilityLeftWidgetId,
  NexusUtilityWidgetId,
} from "./nexus-utility-widget-ids"

export type NexusUtilityWidgetRegistryEntry = NexusUtilityCatalogEntry & {
  id: NexusRightUtilityWidgetId
  widget: NonNullable<NexusUtilityCatalogEntry["widget"]>
}

export type UtilityWidgetVisibilityPrefs = Partial<
  Record<NexusUtilityWidgetId, boolean>
>

export const NEXUS_UTILITY_WIDGET_REGISTRY: Record<
  NexusRightUtilityWidgetId,
  NexusUtilityWidgetRegistryEntry
> = Object.fromEntries(
  NEXUS_UTILITY_CATALOG.flatMap((entry) =>
    entry.widget !== null && isInstalledNexusRightUtilityWidgetId(entry.id)
      ? [[entry.id, entry as NexusUtilityWidgetRegistryEntry]]
      : []
  )
) as Record<NexusRightUtilityWidgetId, NexusUtilityWidgetRegistryEntry>

export function isLeftUtilityWidgetId(
  _id: NexusUtilityWidgetId
): _id is NexusUtilityLeftWidgetId {
  return false
}

export function isRightUtilityWidgetId(
  id: NexusUtilityWidgetId
): id is NexusRightUtilityWidgetId {
  return isInstalledNexusRightUtilityWidgetId(id)
}

export function defaultUtilityWidgetVisibility(
  id: NexusUtilityWidgetId
): boolean {
  const entry = getRightUtilityCatalogEntry(id)
  return entry?.widget.defaultVisible ?? false
}

export function isUtilityWidgetCustomizable(id: NexusUtilityWidgetId): boolean {
  const entry = getRightUtilityCatalogEntry(id)
  return entry?.widget.customizable ?? false
}

export function getRightUtilityCatalogEntry(
  id: NexusUtilityWidgetId
): NexusUtilityWidgetRegistryEntry | null {
  if (!isInstalledNexusRightUtilityWidgetId(id)) return null
  return NEXUS_UTILITY_WIDGET_REGISTRY[id]
}

export function migrateUtilityWidgetPrefs(
  prefs: UtilityWidgetVisibilityPrefs
): UtilityWidgetVisibilityPrefs {
  if (!("right.integrations" in prefs)) return prefs
  const next = { ...prefs }
  const legacy = next["right.integrations"]
  delete next["right.integrations"]
  if (typeof legacy === "boolean" && !("right.marketplace" in next)) {
    next["right.marketplace"] = legacy
  }
  return next
}

export function isWidgetVisibleInPrefs(
  prefs: UtilityWidgetVisibilityPrefs,
  id: NexusUtilityWidgetId
): boolean {
  const entry = prefs[id]
  if (typeof entry === "boolean") return entry
  return defaultUtilityWidgetVisibility(id)
}

export function getVisibleRightUtilityWidgetIds(input: {
  prefs: UtilityWidgetVisibilityPrefs
  availability: NexusRightUtilityAvailabilityContext
}): NexusRightUtilityWidgetId[] {
  return (
    Object.values(
      NEXUS_UTILITY_WIDGET_REGISTRY
    ) as NexusUtilityWidgetRegistryEntry[]
  )
    .filter((entry) =>
      isNexusRightUtilityAvailable(entry.id, input.availability)
    )
    .filter((entry) => isWidgetVisibleInPrefs(input.prefs, entry.id))
    .sort((a, b) => a.widget.priority - b.widget.priority)
    .slice(0, NEXUS_RIGHT_RAIL_VISIBLE_LIMIT)
    .map((entry) => entry.id) as NexusRightUtilityWidgetId[]
}

export function getEligibleCustomizeRightWidgetIds(
  availability: NexusRightUtilityAvailabilityContext
): NexusRightUtilityWidgetId[] {
  return (
    Object.values(
      NEXUS_UTILITY_WIDGET_REGISTRY
    ) as NexusUtilityWidgetRegistryEntry[]
  )
    .filter((entry) => entry.widget.customizable)
    .filter((entry) => isNexusRightUtilityAvailable(entry.id, availability))
    .sort((a, b) => a.widget.priority - b.widget.priority)
    .map((entry) => entry.id) as NexusRightUtilityWidgetId[]
}

export function canEnableRightUtilityWidget(input: {
  id: NexusRightUtilityWidgetId
  prefs: UtilityWidgetVisibilityPrefs
  availability: NexusRightUtilityAvailabilityContext
}): boolean {
  if (!isNexusRightUtilityAvailable(input.id, input.availability)) return false
  const visibleIds = getVisibleRightUtilityWidgetIds({
    prefs: input.prefs,
    availability: input.availability,
  })
  if (visibleIds.includes(input.id)) return true
  return visibleIds.length < NEXUS_RIGHT_RAIL_VISIBLE_LIMIT
}
