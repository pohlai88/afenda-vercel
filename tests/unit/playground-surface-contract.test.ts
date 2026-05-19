import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function readPlaygroundRoute(...segments: string[]) {
  return readFileSync(
    join(root, "app", "(main)", "[locale]", "playground", ...segments),
    "utf8"
  )
}

describe("playground three-layer seals", () => {
  it("Layer 1 route seal exists and documents all three layers", () => {
    const seal = readRepo("app/(main)/[locale]/playground/_SEAL.md")
    expect(seal).toContain("Layer 2")
    expect(seal).toContain("lib/features/playground/")
    expect(seal).toContain("components2/playground/")
    expect(seal).toContain("playground")
  })

  it("Layer 2 module root has no _SEAL.md (agent-contract allowlist)", () => {
    expect(
      existsSync(join(root, "lib", "features", "playground", "_SEAL.md"))
    ).toBe(false)
  })

  it("Layer 3 playground UI seal exists", () => {
    const seal = readRepo("components2/playground/_SEAL.md")
    expect(seal).toContain("Layer 3")
  })
})

describe("playground thin route contract", () => {
  it("shell preview page re-exports only from #features/playground/server", () => {
    const content = readPlaygroundRoute("shell-preview", "page.tsx")
    expect(content).toContain("#features/playground/server")
    expect(content).toContain("PlaygroundShellPreviewPage")
    expect(content).not.toContain("#components2/playground")
    expect(content).not.toContain("AppShell")
  })

  it("metadata renderer gallery page re-exports from server barrel", () => {
    const content = readPlaygroundRoute("metadata-renderer-gallery", "page.tsx")
    expect(content).toContain("PlaygroundMetadataRendererGalleryPage")
    expect(content).toContain("#features/playground/server")
    expect(content).not.toContain("GalleryPreviewFrame")
  })

  it("pattern c gallery page re-exports from server barrel", () => {
    const content = readPlaygroundRoute("pattern-c-section-gallery", "page.tsx")
    expect(content).toContain("PlaygroundPatternCSectionGalleryPage")
    expect(content).toContain("#features/playground/server")
    expect(content).not.toContain("GovernedPatternCListSection")
  })
})

describe("playground surface contract", () => {
  it("keeps gallery fixtures and page orchestrators under lib/features/playground", () => {
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "playground",
          "data",
          "gallery-fixtures.ts"
        )
      )
    ).toBe(true)
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "playground",
          "components",
          "playground-shell-preview-page.server.tsx"
        )
      )
    ).toBe(true)
    expect(existsSync(join(root, "lib", "features", "dev"))).toBe(false)
    expect(existsSync(join(root, "app", "(main)", "[locale]", "dev"))).toBe(
      false
    )
  })

  it("exports gallery fixtures from #features/playground for tests (no server pages)", () => {
    const index = readRepo("lib/features/playground/index.ts")
    expect(index).toContain("GALLERY_SCENARIOS")
    expect(index).toContain("SHELL_PREVIEW_HREF")
    expect(index).not.toContain("PlaygroundShellPreviewPage")
    expect(index).not.toContain("./server")
  })

  it("gallery content uses locale-internal playground path constants", () => {
    for (const file of [
      "lib/features/playground/components/playground-metadata-renderer-gallery-content.server.tsx",
      "lib/features/playground/components/playground-pattern-c-section-gallery-content.server.tsx",
    ]) {
      const content = readRepo(file)
      expect(content).not.toMatch(/href="\/en\/playground\//)
      expect(content).toContain("playground-paths.shared")
    }
  })

  it("keeps client barrel free of gallery fixture graph", () => {
    const client = readRepo("lib/features/playground/client.ts")
    expect(client).toContain("SHELL_PREVIEW_HREF")
    expect(client).not.toContain("GALLERY_SCENARIOS")
    expect(client).not.toContain("GALLERY_ACTION_BAR")
  })
})
