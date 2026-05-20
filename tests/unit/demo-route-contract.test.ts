import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { DEMO_ROUTE_MANIFEST, findDemoManifestEntry } from "#features/demo"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function readDemoRoute(...segments: string[]) {
  return readFileSync(
    join(root, "app", "(main)", "[locale]", "demo", ...segments),
    "utf8"
  )
}

function demoPagePathForSlug(slug: string): string {
  return join(
    root,
    "app",
    "(main)",
    "[locale]",
    "demo",
    ...slug.split("/"),
    "page.tsx"
  )
}

describe("demo three-layer seals", () => {
  it("Layer 1 route seal exists", () => {
    const seal = readRepo("app/(main)/[locale]/demo/_SEAL.md")
    expect(seal).toContain("lib/features/demo/")
    expect(seal).toContain("components2/demo/")
    expect(seal).toContain("DemoGuidePanel")
  })

  it("Layer 2 module root has no _SEAL.md", () => {
    expect(existsSync(join(root, "lib", "features", "demo", "_SEAL.md"))).toBe(
      false
    )
  })

  it("Layer 3 demo UI seal exists", () => {
    expect(existsSync(join(root, "components2", "demo", "_SEAL.md"))).toBe(true)
  })

  it("components2/demo imports client door only (no deep feature paths)", () => {
    for (const file of ["demo-shell.tsx", "demo-catalog-card.tsx"]) {
      const content = readRepo(`components2/demo/${file}`)
      expect(content).toContain("#features/demo/client")
      expect(content).not.toMatch(/#features\/demo\/schemas\//)
    }
  })
})

describe("demo thin route contract", () => {
  it("index page re-exports from #features/demo/server", () => {
    const content = readDemoRoute("page.tsx")
    expect(content).toContain("#features/demo/server")
    expect(content).toContain("DemoShowcaseIndexPage")
    expect(content).not.toContain("#components2/demo")
  })

  const availableRouteExports: ReadonlyArray<{
    slug: string
    exportName: string
  }> = [
    { slug: "employee/leave", exportName: "DemoEmployeeLeavePage" },
    { slug: "hrm/employee-records", exportName: "DemoEmployeeRecordsPage" },
    {
      slug: "procurement/purchase-request",
      exportName: "DemoProcurementPurchaseRequestPage",
    },
    {
      slug: "inventory/stock-movement",
      exportName: "DemoInventoryStockMovementPage",
    },
    { slug: "workbench/shell", exportName: "DemoWorkbenchShellPage" },
  ]

  it.each(availableRouteExports)(
    "$slug page re-exports $exportName and generateMetadata from #features/demo/server",
    ({ slug, exportName }) => {
      const content = readFileSync(demoPagePathForSlug(slug), "utf8")
      expect(content).toContain("#features/demo/server")
      expect(content).toContain(exportName)
      expect(content).toContain("generateMetadata")
      expect(content).not.toContain("requireOrgSession")
      expect(content).not.toContain("requirePortalContext")
    }
  )

  it("layout sets RouteEnvelope surface demo", () => {
    const content = readDemoRoute("layout.tsx")
    expect(content).toContain('surface: "demo"')
    expect(content).not.toContain("requireOrgSession")
    expect(content).not.toContain("requirePortalContext")
  })
})

describe("demo surface contract", () => {
  it("leave page uses compose helper and avoids production guards", () => {
    const leavePage = readRepo(
      "lib/features/demo/components/demo-employee-leave-page.server.tsx"
    )
    const compose = readRepo(
      "lib/features/demo/components/demo-route-page-compose.server.tsx"
    )
    expect(leavePage).toContain("composeDemoRoutePage")
    expect(compose).toContain("DemoGuidePanel")
    expect(compose).toContain("DemoShell")
    expect(leavePage).not.toContain("requireEmployeePortalContext")
    expect(leavePage).not.toContain("EmployeePortalLeavePage")
  })

  it("route orchestrators use composeDemoRoutePage except leave fixture wiring", () => {
    const composed = [
      "demo-employee-records-page.server.tsx",
      "demo-procurement-purchase-request-page.server.tsx",
      "demo-inventory-stock-movement-page.server.tsx",
      "demo-workbench-shell-page.server.tsx",
      "demo-employee-leave-page.server.tsx",
    ]
    for (const file of composed) {
      expect(readRepo(`lib/features/demo/components/${file}`)).toContain(
        "composeDemoRoutePage"
      )
    }
  })

  it("fixture list builders use assertGovernedSurfaceInput", () => {
    for (const file of [
      "demo-procurement-pr.fixture.server.ts",
      "demo-inventory-movement.fixture.server.ts",
    ]) {
      expect(readRepo(`lib/features/demo/data/${file}`)).toContain(
        "assertGovernedSurfaceInput"
      )
    }
  })

  it("seed-demo-erp script exists for Lane B", () => {
    expect(existsSync(join(root, "scripts", "seed-demo-erp.mjs"))).toBe(true)
  })

  it("employee records demo reuses workforce list builder without WorkforcePage", () => {
    const content = readRepo(
      "lib/features/demo/components/demo-employee-records-readonly-surface.server.tsx"
    )
    expect(content).toContain("buildWorkforceListSurfaceConfiguration")
    expect(content).not.toContain("WorkforcePage")
    expect(content).not.toContain("requireOrgSession")
  })

  it("demo app tree does not import db or production session guards", () => {
    const paths = [
      "app/(main)/[locale]/demo/page.tsx",
      "app/(main)/[locale]/demo/layout.tsx",
      ...DEMO_ROUTE_MANIFEST.filter((e) => e.status === "available").map(
        (e) => `app/(main)/[locale]/demo/${e.slug}/page.tsx`
      ),
    ]
    for (const rel of paths) {
      const content = readRepo(rel)
      expect(content).not.toContain("#lib/db")
      expect(content).not.toContain("requireOrgSession")
      expect(content).not.toContain("requirePortalContext")
    }
  })

  it("proxy protected prefixes exclude /demo", () => {
    const content = readRepo("lib/auth/proxy-protected-paths.shared.ts")
    expect(content).not.toMatch(/["']\/demo["']/)
  })

  it("available manifest entries have route files on disk", () => {
    for (const entry of DEMO_ROUTE_MANIFEST) {
      if (entry.status !== "available") continue
      expect(existsSync(demoPagePathForSlug(entry.slug))).toBe(true)
      expect(findDemoManifestEntry(entry.slug)?.status).toBe("available")
    }
  })

  it("manifest has no planned entries while Phase 4 catalog is complete", () => {
    expect(
      DEMO_ROUTE_MANIFEST.every((entry) => entry.status === "available")
    ).toBe(true)
  })
})
