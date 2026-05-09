import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readProjectFile(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf-8")
}

describe("landing cookie consent preview", () => {
  it("renders the consent preview from the locale home page", () => {
    const page = readProjectFile("app", "[locale]", "page.tsx")

    expect(page).toContain("CookieConsentPreview")
    expect(page).toContain("LandingFooter")
    expect(page).toContain('t("cookieConsent.comingSoon")')
  })

  it("keeps accept and reject controls disabled while coming soon", () => {
    const component = readProjectFile(
      "components",
      "marketing",
      "cookie-consent-preview.tsx"
    )

    expect(component).toContain("comingSoonLabel")
    expect(component).toContain('href={"/cookies"')
    expect(component).toContain("rejectLabel")
    expect(component).toContain("acceptLabel")
    expect(component.match(/disabled/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(component).not.toContain("document.cookie")
    expect(component).not.toContain("localStorage")
  })

  it("ships home copy that marks the controls as coming soon", () => {
    const messages = JSON.parse(
      readProjectFile("messages", "en.json")
    ) as typeof import("../../messages/en.json")

    expect(messages.Home.cookieConsent.comingSoon).toBe("Coming soon")
    expect(messages.Home.cookieConsent.description).toContain("disabled")
    expect(messages.Home.cookieConsent.description).toContain(
      "future non-essential categories"
    )
  })
})
