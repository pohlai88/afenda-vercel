import type {
  WorkbenchRailNavIconId,
  WorkbenchRailNavSection,
  WorkbenchRailSlots,
} from "#components/workbench/left-nav-rail"

import type { AccountRailSection } from "./account-shell.types"

/**
 * Adapts account domain data → `WorkbenchRailSlots`.
 *
 * Pure server function — no browser APIs, no hooks.
 *
 * The Working Memory Rail migration (see
 * `docs/_draft/working-memory-rail-plan.md`) removed the decorative
 * `pills` and `context` slots from the rail kernel. This builder is now a
 * straight pass-through from nav sections; future conditional slots (Phase 3 —
 * inbox, views, pinned, recents) plug in here once the kernel exposes them.
 */
export function buildAccountRailSlotsV2({
  sections,
}: {
  sections: AccountRailSection[]
}): WorkbenchRailSlots {
  const navSection: WorkbenchRailNavSection = {
    id: "account",
    items: sections.map((section) => ({
      id: section.id,
      label: section.label,
      description: section.description,
      href: section.href,
      icon: iconForSectionId(section.id),
      activePatterns: resolveAccountRailSectionActivePatterns(section),
      items: section.children?.map((child) => ({
        id: child.id,
        label: child.label,
        description: child.description,
        href: child.href,
        match: child.match,
        activePatterns: child.matchPath ? [child.matchPath] : undefined,
      })),
    })),
  }

  return {
    nav: [navSection],
  }
}

function resolveAccountRailSectionActivePatterns(
  section: AccountRailSection
): string[] | undefined {
  if (!section.matchPath) return undefined
  if (!section.activeHash) return [section.matchPath]

  if (!section.href.includes(`#${section.activeHash}`)) {
    throw new Error(
      `buildAccountRailSlotsV2: section "${section.id}" declares activeHash "${section.activeHash}" but href "${section.href}" does not include it`
    )
  }

  return undefined
}

function iconForSectionId(
  id: AccountRailSection["id"]
): WorkbenchRailNavIconId {
  switch (id) {
    case "identity":
      return "user-round"
    case "orbit":
      return "activity"
    case "sessions":
      return "monitor-smartphone"
    case "authority":
      return "shield"
    case "workspace":
      return "building-2"
    default:
      return "key-round"
  }
}
