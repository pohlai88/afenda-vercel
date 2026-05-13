import type {
  WorkbenchRailNavItem,
  WorkbenchRailNavSection,
} from "./workbench-rail.schema"

/**
 * Client-side filter for primary rail nav — matches label + optional description.
 * Memory slots (inbox / pinned / views / recents) are not part of `nav` and are
 * never filtered here.
 */
export function filterWorkbenchRailNavSections(
  nav: readonly WorkbenchRailNavSection[],
  query: string
): WorkbenchRailNavSection[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return nav.map((section) => ({
      ...section,
      items: section.items.map(cloneNavItem),
    }))
  }

  return nav
    .map((section) => {
      const items = section.items
        .map((item) => {
          const itemMatches = navTextMatches(item.label, item.description, q)
          const matchingChildren = item.items?.filter((child) =>
            navTextMatches(child.label, child.description, q)
          )

          if (itemMatches) return cloneNavItem(item)
          if (matchingChildren?.length) {
            return {
              ...item,
              items: matchingChildren.map((child) => ({ ...child })),
            }
          }

          return null
        })
        .filter((item) => item !== null)

      return {
        ...section,
        items,
      }
    })
    .filter((section) => section.items.length > 0)
}

function cloneNavItem(item: WorkbenchRailNavItem): WorkbenchRailNavItem {
  return {
    ...item,
    items: item.items?.map((child) => ({ ...child })),
  }
}

function navTextMatches(
  label: string,
  description: string | undefined,
  query: string
): boolean {
  return `${label} ${description ?? ""}`.toLowerCase().includes(query)
}
