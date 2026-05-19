import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function readBootstrapRoute(...segments: string[]) {
  return readFileSync(
    join(root, "app", "(main)", "[locale]", "bootstrap", ...segments),
    "utf8"
  )
}

describe("bootstrap three-layer seals", () => {
  it("Layer 1 route seal exists and documents all three layers", () => {
    const seal = readRepo("app/(main)/[locale]/bootstrap/_SEAL.md")
    expect(seal).toContain("Three layers")
    expect(seal).toContain("lib/features/bootstrap/")
    expect(seal).toContain("components2/bootstrap/")
    expect(seal).toContain("bootstrap")
  })

  it("Layer 2 module root has no _SEAL.md (agent-contract allowlist)", () => {
    expect(
      existsSync(join(root, "lib", "features", "bootstrap", "_SEAL.md"))
    ).toBe(false)
  })
})

describe("bootstrap thin route contract", () => {
  it("page re-exports only from #features/bootstrap/server", () => {
    const content = readBootstrapRoute("page.tsx")
    expect(content).toContain("#features/bootstrap/server")
    expect(content).toContain("BootstrapSetupPage")
    expect(content).not.toContain("#components2/bootstrap")
    expect(content).not.toContain("requireSignedInSession")
  })

  it("layout delegates shell to BootstrapDeferredShell from server barrel", () => {
    const content = readBootstrapRoute("layout.tsx")
    expect(content).toContain("BootstrapDeferredShell")
    expect(content).toContain("#features/bootstrap/server")
    expect(content).not.toContain("buildAppShellBootstrapUtilityBarSlots")
  })

  it("loading re-exports bootstrap loading skeleton from layer 3", () => {
    const content = readBootstrapRoute("loading.tsx")
    expect(content).toContain("#components2/bootstrap/bootstrap-loading")
  })
})

describe("bootstrap surface contract", () => {
  it("keeps data and orchestrators under lib/features/bootstrap", () => {
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "bootstrap",
          "data",
          "post-login-org-dispatch.server.ts"
        )
      )
    ).toBe(true)
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "bootstrap",
          "components",
          "bootstrap-setup-page.server.tsx"
        )
      )
    ).toBe(true)
  })

  it("uses client create-org form with org-admin client barrel", () => {
    const form = readRepo(
      "components2/bootstrap/bootstrap-create-org-form.client.tsx"
    )
    expect(form).toContain('"use client"')
    expect(form).toContain("#features/org-admin/client")
    expect(form).not.toContain("#features/org-admin/server")
  })

  it("Layer 2 orchestrators compose #components2/bootstrap only (no paint imports)", () => {
    for (const file of [
      "lib/features/bootstrap/components/bootstrap-setup-page.server.tsx",
      "lib/features/bootstrap/components/org-dispatch-page.server.tsx",
      "lib/features/bootstrap/components/bootstrap-pending-invites-section.server.tsx",
    ]) {
      const content = readRepo(file)
      expect(content).toContain("#components2/bootstrap")
      expect(content).not.toContain("#components2/ui/button")
      expect(content).not.toContain("#components2/afenda-brand")
    }
  })

  it("Layer 3 barrel exports bootstrap presentation surfaces", () => {
    const barrel = readRepo("components2/bootstrap/index.ts")
    expect(barrel).toContain("BootstrapFirstRunShell")
    expect(barrel).toContain("OrgDispatchPicker")
    expect(barrel).toContain("BootstrapPendingInvites")
  })

  it("o/page.tsx re-exports OrgDispatchPage from bootstrap server barrel", () => {
    const content = readRepo("app/(main)/[locale]/o/page.tsx")
    expect(content).toContain("#features/bootstrap/server")
    expect(content).toContain("OrgDispatchPage")
    expect(content).not.toContain("#components2/bootstrap")
  })

  it("does not retain deleted components/console paths", () => {
    expect(existsSync(join(root, "components", "console"))).toBe(false)
    expect(existsSync(join(root, "lib", "features", "console"))).toBe(false)
  })
})
