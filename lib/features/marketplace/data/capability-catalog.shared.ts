import {
  NEXUS_UTILITY_CATALOG,
  isInstalledNexusRightUtilityWidgetId,
} from "#features/nexus"

import type { CapabilityCategory } from "../marketplace.contract"
import type { CapabilityDefinition } from "../types"

/**
 * Capability Registry — catalog adapter.
 *
 * Single source of truth for what is *installable* lives in the per-
 * category source catalogs (today: `NEXUS_UTILITY_CATALOG`).
 * `getCapabilityDefinitions` adapts each entry to a generic
 * `CapabilityDefinition` the resolver and the Marketplace UI consume.
 *
 * Doctrinal — `NEXUS_UTILITY_CATALOG` stays the single source of
 * truth for utility-bar widgets. This adapter never copies catalog
 * content; it projects the existing entries through a category lens
 * so a future catalog migration cleanly delegates to a different
 * source for `plugins` / `mcp` / etc.
 */

const NEXUS_UTILITY_SOURCE = "nexus-utility" as const

type NexusWidgetGates = {
  readonly adminOnly?: boolean
  readonly mobileOnly?: boolean
  readonly multiOrgOnly?: boolean
  readonly multiLocaleOnly?: boolean
}

function adaptNexusUtility(
  entry: (typeof NEXUS_UTILITY_CATALOG)[number]
): CapabilityDefinition | null {
  if (entry.widget === null) return null
  if (!isInstalledNexusRightUtilityWidgetId(entry.id)) return null

  // The const-asserted catalog yields a discriminated union of literal
  // widget shapes; runtime gate flags are only present on the variants
  // that declare them. Cast to a structural superset whose optional
  // keys are all-or-nothing — the shape itself is honest.
  const gates = entry.widget as unknown as NexusWidgetGates
  const widget = entry.widget
  const runtimeGates: {
    adminOnly?: boolean
    mobileOnly?: boolean
    multiOrgOnly?: boolean
    multiLocaleOnly?: boolean
  } = {}
  if (gates.adminOnly) runtimeGates.adminOnly = true
  if (gates.mobileOnly) runtimeGates.mobileOnly = true
  if (gates.multiOrgOnly) runtimeGates.multiOrgOnly = true
  if (gates.multiLocaleOnly) runtimeGates.multiLocaleOnly = true

  return {
    id: entry.id,
    category: "utilities",
    itemKey: entry.itemKey,
    iconKey: entry.iconKey,
    priority: widget.priority,
    defaultVisible: widget.defaultVisible,
    customizable: widget.customizable,
    runtimeGates,
    source: NEXUS_UTILITY_SOURCE,
    nexusUtilityId: entry.id,
  }
}

let cachedDefinitions: readonly CapabilityDefinition[] | null = null

/**
 * Returns every capability the Marketplace registry knows about,
 * across all categories. Memoized — definitions are derived from
 * static catalogs and never change at runtime.
 */
export function getCapabilityDefinitions(): readonly CapabilityDefinition[] {
  if (cachedDefinitions !== null) return cachedDefinitions
  const out: CapabilityDefinition[] = []
  for (const entry of NEXUS_UTILITY_CATALOG) {
    const adapted = adaptNexusUtility(entry)
    if (adapted) out.push(adapted)
  }
  cachedDefinitions = out
  return out
}

/** Lookup by capability id. Returns `null` for unknown ids — never throws. */
export function getCapabilityDefinition(
  id: string
): CapabilityDefinition | null {
  return getCapabilityDefinitions().find((entry) => entry.id === id) ?? null
}

/** Filters to one category — used by the category route pages. */
export function getCapabilitiesForCategory(
  category: CapabilityCategory
): readonly CapabilityDefinition[] {
  return getCapabilityDefinitions().filter(
    (entry) => entry.category === category
  )
}

/** Predicate against the live registry — used by Server Action validators. */
export function isKnownCapabilityId(id: string): boolean {
  return getCapabilityDefinition(id) !== null
}
