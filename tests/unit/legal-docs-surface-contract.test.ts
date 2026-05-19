/**
 * Legal-docs surface contract — three-layer guard (parity with auth-surface-contract).
 */

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readLegalDocsPage(): string {
  return readFileSync(
    join(
      ROOT,
      "app",
      "(main)",
      "[locale]",
      "legal-docs",
      "[...slug]",
      "page.tsx"
    ),
    "utf-8"
  )
}

function readLegalDocsFeatureComponent(name: string): string {
  return readFileSync(
    join(ROOT, "lib", "features", "legal-docs", "components", name),
    "utf-8"
  )
}

function readLegalDocsUiComponent(name: string): string {
  return readFileSync(join(ROOT, "components2", "legal-docs", name), "utf-8")
}

describe("Legal-docs three-layer seals", () => {
  it("Layer 1 route seal exists", () => {
    expect(
      existsSync(
        join(ROOT, "app", "(main)", "[locale]", "legal-docs", "_SEAL.md")
      )
    ).toBe(true)
  })

  it("Layer 1 route seal documents all three layers", () => {
    const seal = readFileSync(
      join(ROOT, "app", "(main)", "[locale]", "legal-docs", "_SEAL.md"),
      "utf-8"
    )
    expect(seal).toContain("Layer 2")
    expect(seal).toContain("lib/features/legal-docs/")
    expect(seal).toContain("components2/legal-docs/")
  })

  it("Layer 2 module root has no _SEAL.md (agent-contract allowlist)", () => {
    expect(
      existsSync(join(ROOT, "lib", "features", "legal-docs", "_SEAL.md"))
    ).toBe(false)
  })

  it("Layer 3 legal-docs UI seal exists", () => {
    const seal = readFileSync(
      join(ROOT, "components2", "legal-docs", "_SEAL.md"),
      "utf-8"
    )
    expect(seal).toContain("Layer 3")
  })

  it("retired split modules stay deleted", () => {
    expect(existsSync(join(ROOT, "lib", "features", "public-trust"))).toBe(false)
    expect(existsSync(join(ROOT, "lib", "features", "legal-declarations"))).toBe(
      false
    )
  })
})

describe("Layer 1 thin route contract", () => {
  it("legal-docs page re-exports shared params from index and server page from server barrel", () => {
    const content = readLegalDocsPage()
    expect(content).toContain("#features/legal-docs")
    expect(content).toContain("#features/legal-docs/server")
    expect(content).not.toContain("#components2/legal-docs")
    expect(content).not.toContain("#components2/marketing")
    expect(content).not.toContain("await ")
    expect(content).not.toContain("notFound")
  })
})

describe("Layer 2 orchestrator contract", () => {
  it("public index barrel stays client-safe (no cached server page exports)", () => {
    const barrel = readFileSync(
      join(ROOT, "lib", "features", "legal-docs", "index.ts"),
      "utf-8"
    )
    expect(barrel).not.toContain("legal-docs-declaration-page.server")
    expect(barrel).not.toContain("legal-docs-route-page.server")
    expect(barrel).not.toContain("legal-docs-metadata.server")
  })

  it("LegalDocsRoutePage resolves slug and notFound before Suspense pages", () => {
    const content = readLegalDocsFeatureComponent(
      "legal-docs-route-page.server.tsx"
    )
    expect(content).toContain("resolveLegalDocsSlug")
    expect(content).toContain("notFound()")
    expect(content).toContain("LegalDocsTrustPage")
    expect(content).toContain("LegalDocsStatusPage")
    expect(content).toContain("LegalDocsDeclarationPage")
    expect(content).not.toContain("getCachedOpenStatusPublicSnapshot")
  })

  it("LegalDocsStatusPage imports StatusControlSkeleton from #components2/legal-docs", () => {
    const content = readLegalDocsFeatureComponent(
      "legal-docs-status-page.server.tsx"
    )
    expect(content).toContain("StatusControlSkeleton")
    expect(content).toContain("#components2/legal-docs")
  })

  it("OpenStatus fetch lives in body components only", () => {
    for (const file of [
      "legal-docs-trust-body.server.tsx",
      "legal-docs-status-body.server.tsx",
    ]) {
      const content = readLegalDocsFeatureComponent(file)
      expect(content).toContain("getCachedOpenStatusPublicSnapshot")
    }
  })
})

describe("Layer 3 legal-docs UI contract", () => {
  it("DeclarationShell imports registry types from #features/legal-docs only", () => {
    const content = readLegalDocsUiComponent("declaration-shell.tsx")
    expect(content).toContain("DeclarationShell")
    expect(content).toContain("#features/legal-docs")
    expect(content).not.toContain("getCachedOpenStatusPublicSnapshot")
  })

  it("legal-docs UI barrel exports presentation surfaces", () => {
    const barrel = readFileSync(
      join(ROOT, "components2", "legal-docs", "index.ts"),
      "utf-8"
    )
    expect(barrel).toContain("DeclarationShell")
    expect(barrel).toContain("StatusControlSkeleton")
    expect(barrel).toContain("TrustControlSurface")
  })
})
