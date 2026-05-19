import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function readDevRoute(...segments: string[]) {
  return readFileSync(
    join(root, "app", "(main)", "[locale]", "dev", ...segments),
    "utf8"
  )
}

describe("dev three-layer seals", () => {
  it("Layer 1 route seal exists and documents all three layers", () => {
    const seal = readRepo("app/(main)/[locale]/dev/_SEAL.md")
    expect(seal).toContain("Layer 2")
    expect(seal).toContain("lib/features/dev/")
    expect(seal).toContain("components2/dev/")
    expect(seal).toContain("dev")
  })

  it("Layer 2 module root has no _SEAL.md (agent-contract allowlist)", () => {
    expect(existsSync(join(root, "lib", "features", "dev", "_SEAL.md"))).toBe(
      false
    )
  })

  it("Layer 3 dev UI seal exists", () => {
    const seal = readRepo("components2/dev/_SEAL.md")
    expect(seal).toContain("Layer 3")
  })
})

describe("dev thin route contract", () => {
  it("shell preview page re-exports only from #features/dev/server", () => {
    const content = readDevRoute("shell-preview", "page.tsx")
    expect(content).toContain("#features/dev/server")
    expect(content).toContain("DevShellPreviewPage")
    expect(content).not.toContain("#components2/dev")
    expect(content).not.toContain("AppShell")
  })

  it("metadata renderer gallery page re-exports from server barrel", () => {
    const content = readDevRoute("metadata-renderer-gallery", "page.tsx")
    expect(content).toContain("DevMetadataRendererGalleryPage")
    expect(content).toContain("#features/dev/server")
    expect(content).not.toContain("GalleryPreviewFrame")
  })

  it("pattern c gallery page re-exports from server barrel", () => {
    const content = readDevRoute("pattern-c-section-gallery", "page.tsx")
    expect(content).toContain("DevPatternCSectionGalleryPage")
    expect(content).toContain("#features/dev/server")
    expect(content).not.toContain("GovernedPatternCListSection")
  })
})

describe("dev surface contract", () => {
  it("keeps gallery fixtures and page orchestrators under lib/features/dev", () => {
    expect(
      existsSync(join(root, "lib", "features", "dev", "data", "gallery-fixtures.ts"))
    ).toBe(true)
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "dev",
          "components",
          "dev-shell-preview-page.server.tsx"
        )
      )
    ).toBe(true)
    expect(
      existsSync(
        join(root, "components2", "dev", "metadata-renderer-gallery", "preview-page.tsx")
      )
    ).toBe(false)
    expect(
      existsSync(join(root, "components2", "dev", "fixtures", "preview-href.shared.ts"))
    ).toBe(false)
  })

  it("exports gallery fixtures from #features/dev for tests", () => {
    const index = readRepo("lib/features/dev/index.ts")
    expect(index).toContain("GALLERY_SCENARIOS")
    expect(index).toContain("SHELL_PREVIEW_HREF")
  })

  it("keeps client barrel free of gallery fixture graph", () => {
    const client = readRepo("lib/features/dev/client.ts")
    expect(client).toContain("SHELL_PREVIEW_HREF")
    expect(client).not.toContain("GALLERY_SCENARIOS")
    expect(client).not.toContain("GALLERY_ACTION_BAR")
  })
})
