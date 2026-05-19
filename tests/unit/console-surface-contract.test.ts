import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function readConsoleRoute(...segments: string[]) {
  return readFileSync(
    join(root, "app", "(main)", "[locale]", "console", ...segments),
    "utf8"
  )
}

describe("console three-layer seals", () => {
  it("Layer 1 route seal exists and documents all three layers", () => {
    const seal = readRepo("app/(main)/[locale]/console/_SEAL.md")
    expect(seal).toContain("Layer 2")
    expect(seal).toContain("lib/features/console/")
    expect(seal).toContain("components2/console/")
    expect(seal).toContain("console")
  })

  it("Layer 2 module root has no _SEAL.md (agent-contract allowlist)", () => {
    expect(
      existsSync(join(root, "lib", "features", "console", "_SEAL.md"))
    ).toBe(false)
  })

  it("Layer 3 console UI seal exists", () => {
    const seal = readRepo("components2/console/_SEAL.md")
    expect(seal).toContain("Layer 3")
  })
})

describe("console thin route contract", () => {
  it("page re-exports only from #features/console/server", () => {
    const content = readConsoleRoute("page.tsx")
    expect(content).toContain("#features/console/server")
    expect(content).toContain("ConsoleOrgListPage")
    expect(content).not.toContain("#components2/console")
    expect(content).not.toContain("requireSignedInSession")
    expect(content).not.toContain("listUserOrganizationsForSwitcher")
  })

  it("layout delegates shell to ConsoleDeferredShell from server barrel", () => {
    const content = readConsoleRoute("layout.tsx")
    expect(content).toContain("ConsoleDeferredShell")
    expect(content).toContain("#features/console/server")
    expect(content).not.toContain("buildAppShellConsoleUtilityBarSlots")
    expect(content).not.toContain("requireSignedInSession")
  })

  it("loading re-exports console loading skeleton from layer 3", () => {
    const content = readConsoleRoute("loading.tsx")
    expect(content).toContain("#components2/console/console-loading")
  })
})

describe("console surface contract", () => {
  it("keeps data and orchestrators under lib/features/console", () => {
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "console",
          "data",
          "console-org-context.server.ts"
        )
      )
    ).toBe(true)
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "console",
          "components",
          "console-org-list-page.server.tsx"
        )
      )
    ).toBe(true)
    expect(
      existsSync(join(root, "components2", "console", "console-org-list-slot.tsx"))
    ).toBe(false)
    expect(
      existsSync(
        join(root, "components2", "console", "console-pending-invites.tsx")
      )
    ).toBe(false)
  })

  it("uses client bootstrap form with org-admin client barrel", () => {
    const form = readRepo("components2/console/console-bootstrap-form.client.tsx")
    expect(form).toContain('"use client"')
    expect(form).toContain("#features/org-admin/client")
    expect(form).not.toContain("#features/org-admin/server")
  })

  it("does not retain deleted components/console paths", () => {
    expect(existsSync(join(root, "components", "console"))).toBe(false)
  })
})
