import type {
  WorkbenchRailNavIconId,
  WorkbenchRailNavSection,
  WorkbenchRailSlots,
} from "#components/workbench/rail"

import type {
  AccountRailSection,
  AccountShellSummary,
} from "./account-shell.types"

/**
 * Adapts account domain data → `WorkbenchRailSlots`.
 *
 * Pure server function — no browser APIs, no hooks.
 *
 * The Working Memory Rail migration (see
 * `docs/_draft/working-memory-rail-plan.md`) removed the decorative
 * `pills` and `context` slots from the rail kernel. This builder is now a
 * straight pass-through from the account summary + nav sections; future
 * conditional slots (Phase 3 — inbox, views, pinned, recents) plug in
 * here once the kernel exposes them.
 */
export function buildAccountRailSlotsV2({
  summary,
  sections,
}: {
  summary: AccountShellSummary
  sections: AccountRailSection[]
}): WorkbenchRailSlots {
  const initial = summary.displayName.trim().charAt(0).toUpperCase() || "A"

  const navSection: WorkbenchRailNavSection = {
    id: "account",
    items: sections.map((section) => ({
      id: section.id,
      label: section.label,
      description: section.description,
      href: section.href,
      icon: iconForSectionId(section.id),
    })),
  }

  return {
    identity: {
      initial,
      primary: summary.displayName,
      secondary: summary.email,
    },
    nav: [navSection],
  }
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
