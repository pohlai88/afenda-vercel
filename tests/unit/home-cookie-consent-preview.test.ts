import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readProjectFile(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf-8")
}

describe("landing cookie consent preview", () => {
  it("renders the consent preview from the locale home page", () => {
    const page = readProjectFile("app", "(main)", "[locale]", "page.tsx")

    expect(page).toContain("CookieConsentPreview")
    expect(page).toContain("LandingFooter")
    expect(page).toContain('t("cookieConsent.status")')
  })

  it("persists an active cookie-notice choice in browser storage", () => {
    const component = readProjectFile(
      "components",
      "marketing",
      "cookie-consent-preview.tsx"
    )

    expect(component).toContain("statusLabel")
    expect(component).toContain('href={"/legal-docs/cookies"')
    expect(component).toContain("afenda:cookie-consent-choice")
    expect(component).toContain("rejectLabel")
    expect(component).toContain("acceptLabel")
    expect(component).toContain("localStorage.setItem")
    expect(component).toContain('persistChoice("accepted")')
    expect(component).toContain('persistChoice("rejected")')
    expect(component).toContain("useSyncExternalStore")
    expect(component).toContain("getServerSnapshot")
  })

  it("ships home copy for a live essential-only cookie bar", () => {
    const messages = JSON.parse(
      readProjectFile("messages", "en.json")
    ) as typeof import("../../messages/en.json")

    expect(messages.Home.cookieConsent.status).toBe("Essential only")
    expect(messages.Home.cookieConsent.title).toBe(
      "Essential storage is active."
    )
    expect(messages.Home.cookieConsent.description).toContain(
      "Accept or reject records that you reviewed this notice"
    )
    expect(messages.Home.cookieConsent.acceptedState).toContain(
      "Essential storage remains active"
    )
    expect(messages.Home.cookieConsent.rejectedState).toContain(
      "No non-essential categories are active"
    )
  })
})
