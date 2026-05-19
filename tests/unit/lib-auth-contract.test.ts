import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readAuthModule(name: string): string {
  return readFileSync(join(ROOT, "lib", "auth", name), "utf-8")
}

describe("lib/auth contract", () => {
  it("does not restore deleted legacy alias or org-admin-data modules", () => {
    expect(
      existsSync(
        join(ROOT, "lib", "auth", "legacy-authenticated-route-alias.server.ts")
      )
    ).toBe(false)
    expect(
      existsSync(join(ROOT, "lib", "auth", "org-admin-data.server.ts"))
    ).toBe(false)
  })

  it("keeps profile surface modules out of lib/auth after seal", () => {
    for (const name of [
      "accounts.server.ts",
      "accounts.types.shared.ts",
      "activity.server.ts",
      "security.server.ts",
      "accept-invitation-actions.server.ts",
    ]) {
      expect(existsSync(join(ROOT, "lib", "auth", name))).toBe(false)
    }
    expect(existsSync(join(ROOT, "lib", "auth", "_SEAL.md"))).toBe(true)
    expect(
      existsSync(
        join(
          ROOT,
          "lib",
          "features",
          "iam-profile",
          "data",
          "account-identity.server.ts"
        )
      )
    ).toBe(true)
    expect(existsSync(join(ROOT, "lib", "features", "account"))).toBe(false)
  })

  it("does not export account surface queries from the auth barrel", () => {
    const barrel = readAuthModule("index.ts")
    expect(barrel).not.toContain("listSafeLinkedAccounts")
    expect(barrel).not.toContain("listDeviceSessions")
    expect(barrel).not.toContain("listUserSecurityActivity")
    expect(barrel).not.toContain("acceptOrganizationInvitationAction")
  })

  it("keeps session lifecycle mapping out of audit.server.ts", () => {
    const audit = readAuthModule("audit.server.ts")
    expect(audit).not.toContain("resolveIamSessionLifecycleAudit")
    expect(
      existsSync(join(ROOT, "lib", "auth", "session-lifecycle-audit.shared.ts"))
    ).toBe(true)
  })

  it("exports only global admin helper from permission.server.ts", () => {
    const permission = readAuthModule("permission.server.ts")
    expect(permission).toContain("isGlobalAdminUser")
    expect(permission).not.toContain("canActInOrganization")
  })

  it("does not export retired org-role helpers from the auth barrel", () => {
    const barrel = readAuthModule("index.ts")
    expect(barrel).not.toContain("canActInOrganization")
    expect(barrel).not.toContain("listUserPasskeys")
    expect(barrel).not.toContain("AUTH_CLIENT_ERROR_CODE")
  })

  it("wraps auth API mutations with lifecycle audit recording", () => {
    const route = readFileSync(
      join(ROOT, "app", "api", "auth", "[...path]", "route.ts"),
      "utf-8"
    )
    expect(route).toContain("recordAuthSessionLifecycleAudit")
    expect(route).toContain("wrapAuthHandler")
  })
})
