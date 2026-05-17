import { describe, expect, it } from "vitest"

import type { AppShellPrimaryLeftRailNavSection } from "#app-shell"
import { filterAppShellPrimaryLeftRailNavSections } from "#app-shell"

const NAV: AppShellPrimaryLeftRailNavSection[] = [
  {
    id: "primary",
    items: [
      { id: "a", label: "Alpha", href: "/a", icon: "user-round" },
      {
        id: "b",
        label: "Beta",
        description: "Second line",
        href: "/b",
        icon: "users",
        items: [
          {
            id: "b-child",
            label: "Nested Signal",
            href: "/b/signal",
          },
        ],
      },
    ],
  },
]

describe("filterAppShellPrimaryLeftRailNavSections", () => {
  it("returns cloned sections for a blank query", () => {
    const out = filterAppShellPrimaryLeftRailNavSections(NAV, "  ")
    expect(out).toHaveLength(1)
    expect(out[0].items).toHaveLength(2)
    expect(out[0].items[0]).not.toBe(NAV[0].items[0])
  })

  it("matches labels case-insensitively", () => {
    const out = filterAppShellPrimaryLeftRailNavSections(NAV, "ALP")
    expect(out).toHaveLength(1)
    expect(out[0].items.map((i) => i.id)).toEqual(["a"])
  })

  it("matches description substring", () => {
    const out = filterAppShellPrimaryLeftRailNavSections(NAV, "second")
    expect(out).toHaveLength(1)
    expect(out[0].items.map((i) => i.id)).toEqual(["b"])
  })

  it("keeps a parent item when a nested child matches", () => {
    const out = filterAppShellPrimaryLeftRailNavSections(NAV, "signal")
    expect(out).toHaveLength(1)
    expect(out[0].items.map((i) => i.id)).toEqual(["b"])
    expect(out[0].items[0].items?.map((i) => i.id)).toEqual(["b-child"])
  })

  it("drops sections with no matches", () => {
    const out = filterAppShellPrimaryLeftRailNavSections(NAV, "nomatch")
    expect(out).toHaveLength(0)
  })
})
