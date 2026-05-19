import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

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
        expect(text, `${file} must not reference ${needle}`).not.toContain(needle)
      }
    }
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
    expect(actions).not.toContain("toLocaleRoutePattern(\"/account")
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
      "app/(main)/[locale]/o/[orgSlug]/iam-profile/page.tsx",
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
})
