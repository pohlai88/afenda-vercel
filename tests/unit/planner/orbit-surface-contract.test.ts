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

  it("mounts an Orbit command layer inside the org route segment", () => {
    const content = readRepoFile(
      "app",
      "(main)",
      "[locale]",
      "o",
      "[orgSlug]",
      "apps",
      "orbit",
      "layout.tsx"
    )

    expect(content).toContain("AppShellCommandPalette")
    expect(content).toContain('organizationOrbitPath(orgSlug, "triage")')
    expect(content).toContain('organizationOrbitPath(orgSlug, "sessions")')
    expect(content).toContain("commandQuickLinks.automationAttention.label")
  })

  it("renders session and link detail branches in OrbitPage", () => {
    const content = readRepoFile(
      "lib",
      "features",
      "planner",
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
      "planner",
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
