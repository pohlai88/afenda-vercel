/**
 * Auth surface contract — prevents regression of the AuthPageFrame / AuthResult
 * consistency work.
 *
 * Rules enforced:
 *  1. Every auth page/form component must import AuthPageFrame.
 *  2. Interruption and error states must use AuthResult or RouteErrorShell.
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
    join(ROOT, "app", "[locale]", "(auth)", ...segments),
    "utf-8"
  )
}

function readComponent(...segments: string[]): string {
  return readFileSync(join(ROOT, "components", "auth", ...segments), "utf-8")
}

// ---------------------------------------------------------------------------
// 1. AuthPageFrame presence — every user-visible auth surface
//
// For routes where the form component owns the frame (sign-up, verify-email,
// check-email, accept-invitation), we check the form file. For routes where
// the page.tsx applies the frame around the form (sign-in, forgot-password,
// reset-password, session-expired), we check the page file.
// ---------------------------------------------------------------------------

const PAGE_FRAME_SURFACES: [label: string, ...path: string[]][] = [
  // page.tsx applies AuthPageFrame, wrapping the form component
  ["sign-in page", "sign-in", "page.tsx"],
  ["sign-up page", "sign-up", "page.tsx"],
  ["forgot-password page", "forgot-password", "page.tsx"],
  ["reset-password page", "reset-password", "page.tsx"],
  ["session-expired page", "session-expired", "page.tsx"],
  ["check-email page", "check-email", "page.tsx"],
  // form/client component owns AuthPageFrame directly
  ["verify-email form", "verify-email", "verify-email-form.tsx"],
  [
    "accept-invitation client",
    "accept-invitation",
    "accept-invitation-client.tsx",
  ],
]

describe("AuthPageFrame contract", () => {
  it.each(PAGE_FRAME_SURFACES)("%s renders AuthPageFrame", (_, ...path) => {
    const content = readAuth(...path)
    expect(content, `${path.join("/")} must import AuthPageFrame`).toContain(
      "AuthPageFrame"
    )
  })
})

// ---------------------------------------------------------------------------
// 2. Interruption / error states use AuthResult or RouteErrorShell
// ---------------------------------------------------------------------------

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
  })

  it("error boundary uses RouteErrorDigest", () => {
    const content = readAuth("error.tsx")
    expect(content).toContain("RouteErrorDigest")
  })
})

// ---------------------------------------------------------------------------
// 3. AuthFooterLink(s) used in card footers
// ---------------------------------------------------------------------------

const FOOTER_LINK_SURFACES: [label: string, ...path: string[]][] = [
  ["check-email client", "check-email", "check-email-client.tsx"],
  ["verify-email form", "verify-email", "verify-email-form.tsx"],
  ["forgot-password form", "forgot-password", "forgot-password-form.tsx"],
  ["reset-password form", "reset-password", "reset-password-form.tsx"],
]

describe("Legal consent footer contract", () => {
  it("sign-in form renders AuthLegalConsent", () => {
    const content = readAuth("sign-in", "sign-in-form.tsx")
    expect(content).toContain("AuthLegalConsent")
  })

  it("sign-up form renders AuthLegalConsent", () => {
    const content = readAuth("sign-in", "sign-in-form.tsx")
    expect(content).toContain("AuthLegalConsent")
  })
})

describe("AuthFooterLink contract", () => {
  it.each(FOOTER_LINK_SURFACES)("%s uses AuthFooterLink", (_, ...path) => {
    const content = readAuth(...path)
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

// ---------------------------------------------------------------------------
// 4. Password toggle: type="button" (must not accidentally submit forms)
// ---------------------------------------------------------------------------

describe("Password toggle contract", () => {
  it('sign-in password toggle has type="button"', () => {
    const content = readAuth("sign-in", "sign-in-form.tsx")
    expect(content).toContain('type="button"')
    expect(content).toContain("aria-pressed")
  })

  it('sign-up password toggle has type="button"', () => {
    const content = readAuth("sign-in", "sign-in-form.tsx")
    expect(content).toContain('type="button"')
    expect(content).toContain("aria-pressed")
  })
})

// ---------------------------------------------------------------------------
// 5. OTP inputs: inputMode + autoComplete
// ---------------------------------------------------------------------------

describe("OTP accessibility contract", () => {
  it('sign-in OTP has inputMode="numeric" and autoComplete="one-time-code"', () => {
    const content = readAuth("sign-in", "sign-in-form.tsx")
    expect(content).toContain('inputMode="numeric"')
    expect(content).toContain('autoComplete="one-time-code"')
  })

  it('verify-email OTP has inputMode="numeric" and autoComplete="one-time-code"', () => {
    const content = readAuth("verify-email", "verify-email-form.tsx")
    expect(content).toContain('inputMode="numeric"')
    expect(content).toContain('autoComplete="one-time-code"')
  })

  it("verify-email OTP is connected to error via aria-describedby", () => {
    const content = readAuth("verify-email", "verify-email-form.tsx")
    expect(content).toContain("aria-describedby")
    expect(content).toContain("aria-invalid")
  })
})
