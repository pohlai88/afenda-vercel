import type { AppShellPrimaryLeftRailNavSection } from "./appshell-primary-left-rail.schema"

export function filterAppShellPrimaryLeftRailNavSections(
  sections: AppShellPrimaryLeftRailNavSection[],
  query: string
): AppShellPrimaryLeftRailNavSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return sections
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      ),
    }))
    .filter((section) => section.items.length > 0)
}
