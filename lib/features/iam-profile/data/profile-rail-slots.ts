import type {
  AppShellPrimaryLeftRailNavIconId,
  AppShellPrimaryLeftRailNavSection,
  AppShellPrimaryLeftRailSlots,
} from "#app-shell"

import type { IamProfileRailSection } from "../profile-shell.types"

export function buildIamProfileRailSlots({
  sections,
}: {
  sections: IamProfileRailSection[]
}): AppShellPrimaryLeftRailSlots {
  const navSection: AppShellPrimaryLeftRailNavSection = {
    id: "profile",
    items: sections.map((section) => ({
      id: section.id,
      label: section.label,
      description: section.description,
      href: section.href,
      icon: iconForSectionId(section.id),
      activePatterns: resolveIamProfileRailSectionActivePatterns(section),
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

function resolveIamProfileRailSectionActivePatterns(
  section: IamProfileRailSection
): string[] | undefined {
  if (!section.matchPath) return undefined
  if (!section.activeHash) return [section.matchPath]

  if (!section.href.includes(`#${section.activeHash}`)) {
    throw new Error(
      `buildIamProfileRailSlots: section "${section.id}" declares activeHash "${section.activeHash}" but href "${section.href}" does not include it`
    )
  }

  return undefined
}

function iconForSectionId(
  id: IamProfileRailSection["id"]
): AppShellPrimaryLeftRailNavIconId {
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
