// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { AnchorHTMLAttributes } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/image", () => ({
  default: ({ fill: _fill, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for `next/image`
    <img alt="" {...props} />
  ),
}))

const TRANSLATIONS: Record<string, string> = {
  "Dashboard.shell.navPanel.brandHome": "Go to dashboard home",
  "Dashboard.shell.navPanel.open": "Open app launcher",
  "Dashboard.shell.navPanel.title": "App launcher",
  "Dashboard.shell.navPanel.nexus": "Nexus",
  "Dashboard.shell.navPanel.nexusDescription": "Current workspace home",
  "Dashboard.shell.navPanel.organizations": "Organizations",
  "Dashboard.shell.navPanel.organizationsDescription":
    "Switch company or workspace",
  "Dashboard.shell.navPanel.modules": "Modules",
  "Dashboard.shell.navPanel.openModule": "Open module",
  "Dashboard.nav.orbit": "Orbit",
  "Dashboard.nav.contacts": "Contacts",
  "Dashboard.nav.knowledge": "Knowledge",
  "Dashboard.nav.lynx": "Lynx",
  "Dashboard.nav.hrm": "HRM",
  "Dashboard.nav.sale": "Sale",
  "Dashboard.nav.purchase": "Purchase",
  "Dashboard.nav.inventory": "Inventory",
  "Dashboard.nav.accounting": "Accounting",
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    TRANSLATIONS[`${namespace}.${key}`] ?? `${namespace}.${key}`,
}))

vi.mock("#i18n/navigation", () => ({
  Link: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    prefetch?: boolean
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/o/acme/dashboard/orbit",
}))

import { AppShellAppLauncher } from "#app-shell/client"

afterEach(() => {
  cleanup()
})

describe("AppShellAppLauncher", () => {
  it("opens the desktop popover without opening the mobile sheet state", async () => {
    render(
      <AppShellAppLauncher
        orgSlug="acme"
        orgName="Acme Berhad"
        showOrgLoadingBay
      />
    )

    const triggers = screen.getAllByRole("button", {
      name: "Open app launcher",
    })
    const desktopTrigger = triggers.find(
      (element) => element.getAttribute("data-slot") === "popover-trigger"
    )
    const mobileTrigger = triggers.find(
      (element) => element.getAttribute("data-slot") === "sheet-trigger"
    )

    expect(desktopTrigger).toBeTruthy()
    expect(mobileTrigger).toBeTruthy()
    if (!desktopTrigger || !mobileTrigger) {
      throw new Error("Expected both launcher trigger variants")
    }

    fireEvent.click(desktopTrigger)

    expect(await screen.findByText("App launcher")).toBeTruthy()
    expect(screen.getByText("Acme Berhad")).toBeTruthy()
    expect(screen.getByRole("link", { name: /Nexus/i })).toBeTruthy()
    expect(screen.getByRole("link", { name: /Organizations/i })).toBeTruthy()
    expect(screen.getByRole("link", { name: /Orbit/i })).toBeTruthy()
    expect(desktopTrigger.getAttribute("aria-expanded")).toBe("true")
    expect(mobileTrigger.getAttribute("aria-expanded")).toBe("false")
  })
})
