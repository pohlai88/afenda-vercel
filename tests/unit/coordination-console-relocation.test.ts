import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("coordination console relocation", () => {
  it("exposes coordination console exports from the client barrel without loading the client graph", () => {
    const client = readRepo("lib/features/coordination/client.ts")
    expect(client).toContain('"use client"')
    expect(client).toContain("OperationalCoordinationConsole")
    expect(client).toContain("buildCoordinationUploadPath")
    expect(client).toContain(
      "./components/operational-coordination-console.client"
    )
  })

  it("keeps OperationalCoordinationConsole in the coordination feature module", () => {
    const componentPath = join(
      root,
      "lib",
      "features",
      "coordination",
      "components",
      "operational-coordination-console.client.tsx"
    )
    expect(existsSync(componentPath)).toBe(true)
    const component = readFileSync(componentPath, "utf8")
    expect(component).toContain(
      "export function OperationalCoordinationConsole"
    )
    expect(component).toContain("export { buildCoordinationUploadPath }")
  })

  it("wires the utility bar coordination slot through #features/coordination/client", () => {
    const utilityBar = readRepo(
      "components2/app-shell/top-utils-bar/appshell-utility-bar-coordination.client.tsx"
    )
    expect(utilityBar).toContain("#features/coordination/client")
    expect(utilityBar).toContain("OperationalCoordinationConsole")
    expect(utilityBar).not.toContain("#features/messenger/client")
  })
})
