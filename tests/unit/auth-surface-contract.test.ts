/**
 * Auth surface contract — prevents regression of the AuthPageFrame / AuthResult
 * consistency work.
 *
 * Rules enforced:
 *  1. Auth route pages wrap content in AuthPageFrame (or delegate to a self-framed client component).
 *  2. Auth route pages wrap content in AuthPageFrame; client components own Card only.
 *  3. Interruption and error states must use AuthResult or RouteErrorShell.
 *  3. Every auth card footer must use AuthFooterLink(s).
 *  4. Password toggle buttons must carry type="button" (no accidental form submit).
 *  5. OTP inputs must declare inputMode="numeric" and autoComplete="one-time-code".
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readAuth(...segments: string[]): string {
  return readFileSync(
    join(ROOT, "app", "(main)", "[locale]", "(auth)", ...segments),
    "utf-8"
  )
}

function readComponent(...segments: string[]): string {
  return readFileSync(join(ROOT, "components2", "auth", ...segments), "utf-8")
}

const PAGE_FRAME_SURFACES: [label: string, ...path: string[]][] = [
  ["sign-in page", "sign-in", "page.tsx"],
  ["sign-up page", "sign-up", "page.tsx"],
  ["forgot-password page", "forgot-password", "page.tsx"],
  ["reset-password page", "reset-password", "page.tsx"],
  ["session-expired page", "session-expired", "page.tsx"],
  ["check-email page", "check-email", "page.tsx"],
  ["verify-email page", "verify-email", "page.tsx"],
  ["accept-invitation page", "accept-invitation", "page.tsx"],
]

describe("AuthPageFrame contract", () => {
  it("Layer 3 UI shelf is sealed", () => {
    expect(
      readFileSync(join(ROOT, "components2", "auth", "_SEAL.md"), "utf-8")
    ).toContain("Layer 3")
  })

  it.each(PAGE_FRAME_SURFACES)("%s renders AuthPageFrame", (_, ...path) => {
    const content = readAuth(...path)
    expect(content, `${path.join("/")} must import AuthPageFrame`).toContain(
      "AuthPageFrame"
    )
  })
})

describe("Interruption state contract", () => {
  it("session-expired uses AuthResult", () => {
    const content = readAuth("session-expired", "page.tsx")
    expect(content).toContain("AuthResult")
  })

  it("accept-invitation missing-id branch uses AuthResult", () => {
    const content = readAuth("accept-invitation", "page.tsx")
    expect(content).toContain("AuthResult")
  })

  it("error boundary uses RouteErrorShell with variant=auth", () => {
    const content = readAuth("error.tsx")
    expect(content).toContain("RouteErrorShell")
    expect(content).toContain('variant="auth"')
    expect(content).toContain('useTranslations("AuthShell")')
  })

  it("error boundary uses RouteErrorDigest", () => {
    const content = readAuth("error.tsx")
    expect(content).toContain("RouteErrorDigest")
  })
})

const FOOTER_LINK_SURFACES: [label: string, ...path: string[]][] = [
  ["check-email client", "check-email-client.tsx"],
  ["verify-email form", "verify-email-form.client.tsx"],
  ["forgot-password form", "forgot-password-form.client.tsx"],
  ["reset-password form", "reset-password-form.client.tsx"],
]

describe("Legal consent footer contract", () => {
  it("sign-in form renders AuthLegalConsent", () => {
    const content = readComponent("sign-in-form.client.tsx")
    expect(content).toContain("AuthLegalConsent")
  })

  it("sign-in form uses SignInFormProvider composition", () => {
    const content = readComponent("sign-in-form.client.tsx")
    expect(content).toContain("SignInFormProvider")
    expect(content).toContain("SignInFormMethodPanels")
  })
})

describe("AuthFooterLink contract", () => {
  it.each(FOOTER_LINK_SURFACES)("%s uses AuthFooterLink", (_, ...path) => {
    const content = readComponent(...path)
    expect(content, `${path.join("/")} must use AuthFooterLink`).toContain(
      "AuthFooterLink"
    )
  })

  it("AuthFooterLink component defines the canonical link class", () => {
    const content = readComponent("auth-footer-links.tsx")
    expect(content).toContain("underline-offset-4")
    expect(content).toContain("hover:text-foreground")
  })
})

describe("Password toggle contract", () => {
  it('sign-in password toggle has type="button"', () => {
    const content = readComponent("sign-in-form-method-panels.client.tsx")
    expect(content).toContain('type="button"')
    expect(content).toContain("aria-pressed")
  })
})

describe("OTP accessibility contract", () => {
  it('sign-in OTP has inputMode="numeric" and autoComplete="one-time-code"', () => {
    const content = readComponent("sign-in-form-method-panels.client.tsx")
    expect(content).toContain('inputMode="numeric"')
    expect(content).toContain('autoComplete="one-time-code"')
  })

  it('verify-email OTP has inputMode="numeric" and autoComplete="one-time-code"', () => {
    const content = readComponent("verify-email-form.client.tsx")
    expect(content).toContain('inputMode="numeric"')
    expect(content).toContain('autoComplete="one-time-code"')
  })

  it("verify-email OTP is connected to error via aria-describedby", () => {
    const content = readComponent("verify-email-form.client.tsx")
    expect(content).toContain("aria-describedby")
    expect(content).toContain("aria-invalid")
  })
})
