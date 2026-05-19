import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function readIamProfilePage(...segments: string[]) {
  return readFileSync(
    join(
      root,
      "app",
      "(main)",
      "[locale]",
      "o",
      "[orgSlug]",
      "iam-profile",
      ...segments
    ),
    "utf8"
  )
}

describe("iam-profile three-layer seals", () => {
  it("Layer 1 route seal exists and documents all three layers", () => {
    const seal = readRepo(
      "app/(main)/[locale]/o/[orgSlug]/iam-profile/_SEAL.md"
    )
    expect(seal).toContain("Layer 2")
    expect(seal).toContain("lib/features/iam-profile/")
    expect(seal).toContain("components2/iam-profile/")
    expect(seal).toContain("iam-profile")
  })

  it("Layer 2 module root has no _SEAL.md (agent-contract allowlist)", () => {
    expect(
      existsSync(join(root, "lib", "features", "iam-profile", "_SEAL.md"))
    ).toBe(false)
  })

  it("Layer 3 iam-profile UI seal exists", () => {
    const seal = readRepo("components2/iam-profile/_SEAL.md")
    expect(seal).toContain("Layer 3")
  })
})

describe("iam-profile thin route contract", () => {
  it("overview page re-exports only from #features/iam-profile/server", () => {
    const content = readIamProfilePage("page.tsx")
    expect(content).toContain("#features/iam-profile/server")
    expect(content).not.toContain("#components2/iam-profile")
    expect(content).not.toContain("getProfileShellData")
    expect(content).not.toContain("AppShellSurface")
  })

  it("identity page re-exports page + metadata from server barrel", () => {
    const content = readIamProfilePage("identity", "page.tsx")
    expect(content).toContain("generateIamProfileIdentityMetadata")
    expect(content).toContain("IamProfileIdentityPage")
    expect(content).toContain("#features/iam-profile/server")
    expect(content).not.toContain("requireAuthShellSignedInSession")
  })

  it("security page re-exports page + metadata from server barrel", () => {
    const content = readIamProfilePage("security", "page.tsx")
    expect(content).toContain("generateIamProfileSecurityMetadata")
    expect(content).toContain("IamProfileSecurityPage")
    expect(content).toContain("#features/iam-profile/server")
    expect(content).not.toContain("listDeviceSessions")
  })

  it("error boundary uses nexus client barrel", () => {
    const content = readIamProfilePage("error.tsx")
    expect(content).toContain("#features/nexus/client")
    expect(content).not.toContain('from "#features/nexus"')
  })
})

describe("iam-profile surface contract", () => {
  it("does not retain deleted account module paths", () => {
    const forbidden = [
      "lib/features/account/",
      "app/(main)/[locale]/(iam)/account",
      "organizationAccountPath",
      "toLocaleOrgAccountRevalidatePattern",
    ]
    const samples = [
      "lib/org-apps-module-paths.ts",
      "lib/i18n/locales.shared.ts",
      "components2/app-shell/compose/appshell-utility-bar-org.server.tsx",
      "app/(main)/[locale]/o/[orgSlug]/iam-profile/page.tsx",
    ]
    for (const file of samples) {
      const text = readRepo(file)
      for (const needle of forbidden) {
        expect(text, `${file} must not reference ${needle}`).not.toContain(
          needle
        )
      }
    }
  })

  it("keeps overview now/recent presentation in layer 3 bands", () => {
    const overviewPage = readRepo(
      "lib/features/iam-profile/components/iam-profile-overview-page.server.tsx"
    )
    const bands = readRepo(
      "components2/iam-profile/iam-profile-overview-bands.tsx"
    )
    expect(overviewPage).toContain("IamProfileOverviewNowBand")
    expect(overviewPage).toContain("IamProfileOverviewRecentBand")
    expect(overviewPage).not.toContain("IamProfileContextBand")
    expect(bands).toContain("IamProfileContextBand")
  })

  it("uses compound identity and security clients", () => {
    const identity = readRepo(
      "components2/iam-profile/iam-profile-identity.client.tsx"
    )
    const security = readRepo(
      "components2/iam-profile/iam-profile-security.client.tsx"
    )
    expect(identity).toContain("IamProfileIdentityProvider")
    expect(identity).toContain("IamProfileIdentityPanels")
    expect(security).toContain("IamProfileSecurityProvider")
    expect(security).toContain("IamProfileSecurityPanels")
  })

  it("does not use /account/ fallbacks in layer 3", () => {
    const layer3 = [
      "components2/iam-profile/iam-profile-identity-context.client.tsx",
      "components2/iam-profile/iam-profile-identity-panels.client.tsx",
      "components2/iam-profile/iam-profile-security-panels.client.tsx",
    ]
    for (const file of layer3) {
      const text = readRepo(file)
      expect(text, file).not.toMatch(/\/account\//)
      expect(text, file).not.toContain('?? "/account')
    }
  })

  it("revalidates security actions with org profile pattern", () => {
    const actions = readRepo(
      "lib/features/iam-profile/actions/security.actions.ts"
    )
    expect(actions).toContain("toLocaleOrgIamProfileRevalidatePattern")
    expect(actions).not.toContain('toLocaleRoutePattern("/account')
  })

  it("does not ship Neon-unsupported passkey, 2FA, or changeEmail UI", () => {
    const forbidden = [
      "addPasskey",
      "changeEmail",
      "twoFactor",
      "passkey",
      "auth-client-neon-compat",
    ]
    const layer3 = [
      "components2/iam-profile/iam-profile-identity-panels.client.tsx",
      "components2/iam-profile/iam-profile-identity-context.client.tsx",
      "components2/iam-profile/iam-profile-security-panels.client.tsx",
      "components2/iam-profile/iam-profile-overview-sections.client.tsx",
      "lib/features/iam-profile/components/iam-profile-overview-page.server.tsx",
    ]
    for (const file of layer3) {
      const text = readRepo(file)
      for (const needle of forbidden) {
        expect(text, `${file} must not reference ${needle}`).not.toContain(
          needle
        )
      }
    }
  })

  it("exports Neon-backed client actions from iam-profile client barrel", () => {
    const client = readRepo("lib/features/iam-profile/client.ts")
    expect(client).toContain("changePasswordAction")
    expect(client).toContain("sendVerificationEmailAction")
    expect(client).toContain("leaveOrganizationAction")
    expect(client).toContain("setActiveOrganizationAction")
    expect(client).toContain("deleteAccountAction")
  })

  it("keeps profile metadata and shell types under allowed subtrees", () => {
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "iam-profile",
          "data",
          "profile-metadata.server.ts"
        )
      )
    ).toBe(true)
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "iam-profile",
          "schemas",
          "profile-shell.types.shared.ts"
        )
      )
    ).toBe(true)
    expect(
      existsSync(
        join(
          root,
          "lib",
          "features",
          "iam-profile",
          "profile-metadata.server.ts"
        )
      )
    ).toBe(false)
    expect(
      existsSync(
        join(root, "lib", "features", "iam-profile", "profile-shell.types.ts")
      )
    ).toBe(false)
  })
})
