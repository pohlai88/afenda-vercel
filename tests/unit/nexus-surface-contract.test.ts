import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function readNexusRoute(...segments: string[]) {
  return readFileSync(
    join(
      root,
      "app",
      "(main)",
      "[locale]",
      "o",
      "[orgSlug]",
      "nexus",
      ...segments
    ),
    "utf8"
  )
}

describe("nexus three-layer seals", () => {
  it("Layer 1 route seal exists and documents all three layers", () => {
    const seal = readRepo("app/(main)/[locale]/o/[orgSlug]/nexus/_SEAL.md")
    expect(seal).toContain("| 2 |")
    expect(seal).toContain("lib/features/nexus/")
    expect(seal).toContain("components2/nexus/")
    expect(seal).toContain("nexus")
  })

  it("Layer 2 module root has no _SEAL.md (agent-contract allowlist)", () => {
    expect(existsSync(join(root, "lib", "features", "nexus", "_SEAL.md"))).toBe(
      false
    )
  })
})

describe("nexus thin route contract", () => {
  it("nexus page re-exports only from #features/nexus/server", () => {
    const content = readNexusRoute("page.tsx")
    expect(content).toContain("#features/nexus/server")
    expect(content).toContain("NexusFieldPage")
    expect(content).not.toContain("#components2/nexus")
    expect(content).not.toContain("getNexusSnapshot")
  })
})

describe("nexus surface contract", () => {
  it("keeps snapshot query and page orchestrator under lib/features/nexus", () => {
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "nexus",
          "components",
          "nexus-field-page.server.tsx"
        )
      )
    ).toBe(true)
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "nexus",
          "data",
          "nexus-snapshot.queries.server.ts"
        )
      )
    ).toBe(true)
    expect(
      existsSync(join(root, "components2", "nexus", "nexus-field-view.tsx"))
    ).toBe(true)
  })

  it("server barrel exports field page and builders", () => {
    const server = readRepo("lib/features/nexus/server.ts")
    expect(server).toContain("NexusFieldPage")
    expect(server).toContain("buildNexusPressureListSurfaceConfiguration")
    expect(server).toContain("buildNexusFieldListSurfaces")
  })

  it("field view uses governed list surfaces for pressure lanes resolutions", () => {
    const view = readRepo("components2/nexus/nexus-field-view.tsx")
    expect(view).toContain("GovernedComponentRenderer")
    expect(view).toContain("NEXUS_PRESSURE_SURFACE_KEY")
    expect(view).not.toContain("NexusOperationalPressure")
  })
})
