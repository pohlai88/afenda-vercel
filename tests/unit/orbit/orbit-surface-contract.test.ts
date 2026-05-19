import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readRepoFile(...segments: string[]) {
  return readFileSync(join(ROOT, ...segments), "utf-8")
}

describe("orbit surface contract", () => {
  it("defines org apps route segment boundaries for Orbit", () => {
    for (const leaf of [
      ["apps", "orbit", "triage", "page.tsx"],
      ["apps", "orbit", "layout.tsx"],
      ["apps", "orbit", "loading.tsx"],
      ["apps", "orbit", "error.tsx"],
    ] as const) {
      expect(
        existsSync(
          join(ROOT, "app", "(main)", "[locale]", "o", "[orgSlug]", ...leaf)
        )
      ).toBe(true)
    }
  })

  it("mounts org command layer at org shell and keeps Orbit command registry in orbit module", () => {
    const orgLayoutContent = readRepoFile(
      "app",
      "(main)",
      "[locale]",
      "o",
      "[orgSlug]",
      "layout.tsx"
    )
    const orbitLayoutContent = readRepoFile(
      "app",
      "(main)",
      "[locale]",
      "o",
      "[orgSlug]",
      "apps",
      "orbit",
      "layout.tsx"
    )
    const orgCommandContent = readRepoFile(
      "lib",
      "features",
      "nexus",
      "components",
      "org-command-layer.tsx"
    )
    const orbitLayerContent = readRepoFile(
      "lib",
      "features",
      "orbit",
      "components",
      "orbit-command-layer.tsx"
    )

    expect(orgLayoutContent).toContain("buildAppShellOrgChrome")
    expect(orgLayoutContent).toContain("command={orgChrome.command}")
    expect(orbitLayoutContent).not.toContain("OrbitCommandLayer")

    expect(orgCommandContent).toContain("AppShellCommandPalette")
    expect(orgCommandContent).toContain("ORG_APPS_MODULES")

    expect(orbitLayerContent).toContain("AppShellCommandPalette")
    expect(orbitLayerContent).toContain("ORBIT_PRIMARY_SURFACES")
  })

  it("wires governed Pattern B list sections for sessions, links, and signals surfaces", () => {
    const pageContent = readRepoFile(
      "lib",
      "features",
      "orbit",
      "views",
      "orbit-page.tsx"
    )
    const metadataContent = readRepoFile(
      "lib",
      "features",
      "orbit",
      "orbit-surface-metadata.shared.ts"
    )

    expect(pageContent).toContain("OrbitGovernedTableList")
    expect(pageContent).toContain("orbitSurfaceUsesGovernedTable")
    expect(metadataContent).toContain("planner:orbit:sessions")
    expect(metadataContent).toContain("planner:orbit:links")
    expect(metadataContent).toContain("planner:orbit:signals")
  })

  it("renders session and link detail branches in OrbitPage", () => {
    const content = readRepoFile(
      "lib",
      "features",
      "orbit",
      "views",
      "orbit-page.tsx"
    )

    expect(content).toContain('focusKind === "session"')
    expect(content).toContain('focusKind === "link"')
    expect(content).toContain("SessionDetailPanel")
    expect(content).toContain("LinkDetailPanel")
    expect(content).toContain("PlannerEvidenceGraphList")
    expect(content).toContain("Record unavailable")
  })

  it("keeps org-only notice controls out of personal Orbit", () => {
    const content = readRepoFile(
      "lib",
      "features",
      "orbit",
      "views",
      "orbit-page.tsx"
    )

    expect(content).toContain(
      'const supportsOrgNotices = scope.scopeKind === "organization"'
    )
    expect(content).toContain("{supportsOrgNotices ? (")
    expect(content).toContain("Close active notices")
    expect(content).toContain("Notice evidence")
  })
})
