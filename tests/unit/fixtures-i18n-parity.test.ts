/**
 * Deterministic parity: `tests/fixtures/*` ↔ `messages/en.json` and canonical
 * repo sources (seed script, auth forms, CSV header registry).
 *
 * Run alone: `pnpm lint:fixtures-parity`
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { ORG_AUDIT_CSV_HEADER_COLUMNS } from "../../lib/auth/org-audit-csv.shared"
import en from "../../messages/en.json"
import { AUTH_PUBLIC_SHELL_COPY } from "../fixtures/auth-public-shell"
import {
  BOOTSTRAP_FIXTURE,
  DEMO_EMPLOYEE_PORTAL_SLUG,
  DEMO_PUBLIC_COPY,
  DEV_SIGNIN_PRESET_EMAILS,
  ORG_ADMIN_AUDIT_E2E_COPY,
  ORG_AUDIT_CSV_HEADER_PROVENANCE_SNIPPET,
} from "../fixtures/bootstrap-mocks"
import {
  CHECK_EMAIL_PAGE_COPY,
  SIGN_UP_PAGE_COPY,
} from "../fixtures/individual-journey"

const repoRoot = path.join(import.meta.dirname, "../..")

function readRepoFile(relPath: string): string {
  return readFileSync(path.join(repoRoot, relPath), "utf8")
}

describe("fixtures ↔ messages/en.json", () => {
  it("DEMO_PUBLIC_COPY matches Home + Auth email label", () => {
    expect(DEMO_PUBLIC_COPY.homeHeading).toBe(en.Home.heading)
    expect(DEMO_PUBLIC_COPY.signInEmailLabel).toBe(en.Auth.labelEmail)
  })

  it("ORG_ADMIN_AUDIT_E2E_COPY matches OrgAdmin.audit", () => {
    expect(ORG_ADMIN_AUDIT_E2E_COPY.pageHeading).toBe(en.OrgAdmin.audit.title)
    expect(ORG_ADMIN_AUDIT_E2E_COPY.originFilterNavAria).toBe(
      en.OrgAdmin.audit.events.viewAria
    )
    expect(ORG_ADMIN_AUDIT_E2E_COPY.viewProduction).toBe(
      en.OrgAdmin.audit.viewProduction
    )
    expect(ORG_ADMIN_AUDIT_E2E_COPY.viewSimulated).toBe(
      en.OrgAdmin.audit.viewSimulated
    )
    expect(ORG_ADMIN_AUDIT_E2E_COPY.viewAll).toBe(en.OrgAdmin.audit.viewAll)
    expect(ORG_ADMIN_AUDIT_E2E_COPY.tableHeaderOrigin).toBe(
      en.OrgAdmin.audit.events.headerOrigin
    )
  })

  it("AUTH_PUBLIC_SHELL_COPY Auth-derived keys match Auth.*", () => {
    expect(AUTH_PUBLIC_SHELL_COPY.signInTabSignUp).toBe(en.Auth.tabSignUp)
    expect(AUTH_PUBLIC_SHELL_COPY.signUpNameLabel).toBe(en.Auth.labelName)
    expect(AUTH_PUBLIC_SHELL_COPY.forgotPasswordTitle).toBe(en.Auth.forgotPassword)
    expect(AUTH_PUBLIC_SHELL_COPY.forgotPasswordSend).toBe(en.Auth.forgotPasswordSend)
    expect(AUTH_PUBLIC_SHELL_COPY.forgotPasswordBackToSignIn).toBe(
      en.Auth.backToSignIn
    )
    expect(AUTH_PUBLIC_SHELL_COPY.resetPasswordTitle).toBe(
      en.Auth.titleResetPassword
    )
    expect(AUTH_PUBLIC_SHELL_COPY.resetPasswordSubmit).toBe(
      en.Auth.resetPasswordSubmit
    )
    expect(AUTH_PUBLIC_SHELL_COPY.resetMissingTokenAlert).toBe(
      en.Auth.resetMissingToken
    )
  })

  it("SIGN_UP_PAGE_COPY matches Auth.*", () => {
    expect(SIGN_UP_PAGE_COPY.heading).toBe(en.Auth.titleSignUp)
    expect(SIGN_UP_PAGE_COPY.nameLabel).toBe(en.Auth.labelName)
    expect(SIGN_UP_PAGE_COPY.emailLabel).toBe(en.Auth.labelEmail)
    expect(SIGN_UP_PAGE_COPY.passwordLabel).toBe(en.Auth.labelPassword)
    expect(SIGN_UP_PAGE_COPY.submitIdle).toBe(en.Auth.submitCreateAccount)
    expect(SIGN_UP_PAGE_COPY.submitPending).toBe(en.Auth.pleaseWait)
    expect(SIGN_UP_PAGE_COPY.signInLink).toBe(en.Auth.tabSignIn)
  })

  it("CHECK_EMAIL_PAGE_COPY matches CheckEmail.*", () => {
    expect(CHECK_EMAIL_PAGE_COPY.heading).toBe(en.CheckEmail.title)
    expect(CHECK_EMAIL_PAGE_COPY.verifyCta).toBe(en.CheckEmail.ctaVerify)
  })

  it("AUTH_PUBLIC_SHELL_COPY verify-email keys match VerifyEmail.*", () => {
    expect(AUTH_PUBLIC_SHELL_COPY.verifyEmailHeading).toBe(en.VerifyEmail.title)
    expect(AUTH_PUBLIC_SHELL_COPY.verifyEmailSubmit).toBe(en.VerifyEmail.submit)
    expect(AUTH_PUBLIC_SHELL_COPY.verifyEmailResend).toBe(en.VerifyEmail.resend)
  })
})

describe("fixtures ↔ repo sources (substring scan)", () => {
  it("ORG_AUDIT_CSV provenance snippet matches org-audit-csv header tail", () => {
    const tail = ORG_AUDIT_CSV_HEADER_COLUMNS.slice(-5).join(",")
    expect(ORG_AUDIT_CSV_HEADER_PROVENANCE_SNIPPET).toBe(tail)
  })

  it("AUTH_PUBLIC_SHELL_COPY auth client forms use i18n keys", () => {
    const forgot = readRepoFile(
      "components2/auth/forgot-password-form.client.tsx"
    )
    const reset = readRepoFile(
      "components2/auth/reset-password-form.client.tsx"
    )
    const verify = readRepoFile(
      "components2/auth/verify-email-form.client.tsx"
    )
    expect(forgot).toContain('useTranslations("Auth")')
    expect(forgot).toContain('t("forgotPassword")')
    expect(forgot).toContain('t("forgotPasswordSend")')
    expect(forgot).toContain('t("backToSignIn")')
    expect(reset).toContain('useTranslations("Auth")')
    expect(reset).toContain('t("titleResetPassword")')
    expect(reset).toContain('t("resetPasswordSubmit")')
    expect(reset).toContain('t("resetMissingToken")')
    expect(verify).toContain('useTranslations("VerifyEmail")')
  })

  it("seed-dev-users.mjs stays aligned with BOOTSTRAP_FIXTURE org + preset emails", () => {
    const seed = readRepoFile("scripts/seed-dev-users.mjs")
    expect(seed).toContain(BOOTSTRAP_FIXTURE.organization.id)
    expect(seed).toContain(BOOTSTRAP_FIXTURE.organization.name)
    expect(seed).toContain(BOOTSTRAP_FIXTURE.organization.slug)
    expect(seed).toContain(DEV_SIGNIN_PRESET_EMAILS.owner)
    expect(seed).toContain(DEV_SIGNIN_PRESET_EMAILS.erp)
    // Member `userId`s in BOOTSTRAP_FIXTURE are deterministic for Vitest/Playwright;
    // the seed script assigns Neon Auth user ids at runtime.
    for (const m of BOOTSTRAP_FIXTURE.members) {
      expect(seed).toContain(m.name)
      expect(seed).toContain(m.email)
    }
  })

  it("dev-signin-panel.tsx stays aligned with demo org + preset emails", () => {
    const panel = readRepoFile("components2/dev/dev-signin-panel.tsx")
    expect(panel).toContain(BOOTSTRAP_FIXTURE.organization.id)
    expect(panel).toContain(BOOTSTRAP_FIXTURE.organization.slug)
    expect(panel).toContain(DEMO_EMPLOYEE_PORTAL_SLUG)
    expect(panel).toContain(DEV_SIGNIN_PRESET_EMAILS.owner)
    expect(panel).toContain(DEV_SIGNIN_PRESET_EMAILS.erp)
  })
})
