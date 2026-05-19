import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readAuthModule(name: string): string {
  return readFileSync(join(ROOT, "lib", "auth", name), "utf-8")
}

describe("org membership session contract", () => {
  it("centralizes membership checks in org-membership.server.ts", () => {
    const membership = readAuthModule("org-membership.server.ts")
    const shared = readAuthModule("org-membership.shared.ts")
    expect(membership).toContain("hasOrgMembership")
    expect(membership).toContain("assertOrgMembership")
    expect(membership).toContain("findOrganizationIdBySlug")
    expect(shared).toContain("mapIamSessionUser")
  })

  it("tenant-session uses shared membership resolver", () => {
    const tenant = readAuthModule("tenant-session.server.ts")
    expect(tenant).toContain('from "./org-membership.server"')
    expect(tenant).toContain("hasOrgMembership")
    expect(tenant).toContain("assertOrgMembership")
    expect(tenant).toContain("mapIamSessionUser")
    expect(tenant).not.toContain("neonAuthMember")
  })

  it("auth-shell-session uses shared membership resolver", () => {
    const shell = readAuthModule("auth-shell-session.server.ts")
    expect(shell).toContain('from "./org-membership.server"')
    expect(shell).toContain("hasOrgMembership")
    expect(shell).toContain("findOrganizationIdBySlug")
    expect(shell).toContain("mapIamSessionUser")
    expect(shell).not.toContain("neonAuthMember")
  })
})
