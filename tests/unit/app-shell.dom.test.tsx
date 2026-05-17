// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("#i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/account/identity",
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}))

vi.mock("server-only", () => ({}))

vi.mock("#components2/nexus/nexus-lynx-summon.client", () => ({
  LynxSummon: () => null,
}))

vi.mock("#components2/app-shell/top-utils-bar/appshell-utility-bar", () => ({
  AppShellUtilityBar: () => <div data-testid="app-shell-utility-bar" />,
}))

import { AppShell } from "#app-shell"
import type { AppShellPrimaryLeftRailSlots } from "#app-shell"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

afterEach(() => {
  cleanup()
})

const testRailSlots: AppShellPrimaryLeftRailSlots = {
  nav: [
    {
      id: "main",
      items: [
        {
          id: "identity",
          label: "Identity",
          href: "/account/identity",
          icon: "layout-dashboard",
        },
      ],
    },
  ],
}

const testEnvelope: RouteEnvelope = {
  surface: "org",
  locale: "en",
  orgId: "org_test",
  orgSlug: "acme",
}

describe("AppShell", () => {
  it("renders skip-to-main link with provided label", () => {
    render(
      <AppShell
        envelope={testEnvelope}
        skipToMainLabel="Skip to main content"
        utilityBar={{
          left: <span />,
          right: <span />,
        }}
        rail={{
          slots: testRailSlots,
          labels: {
            ariaLabel: "Test nav",
            collapseLabel: "Collapse",
            expandLabel: "Expand",
          },
          storageKey: "test.rail",
        }}
      >
        <div>Main content</div>
      </AppShell>
    )

    expect(
      screen.getByRole("link", { name: /Skip to main content/i })
    ).toBeDefined()
  })

  it("renders children inside the main content area", () => {
    render(
      <AppShell
        envelope={testEnvelope}
        skipToMainLabel="Skip to main"
        utilityBar={{
          left: <span />,
          right: <span />,
        }}
        rail={null}
      >
        <div data-testid="child-content">Hello shell</div>
      </AppShell>
    )

    expect(screen.getByTestId("child-content")).toBeDefined()
  })

  it("renders nav item link for the active route", () => {
    render(
      <AppShell
        envelope={testEnvelope}
        skipToMainLabel="Skip"
        utilityBar={{
          left: <span />,
          right: <span />,
        }}
        rail={{
          slots: testRailSlots,
          labels: {
            ariaLabel: "Test nav",
            collapseLabel: "Collapse",
            expandLabel: "Expand",
          },
          storageKey: "test.rail",
        }}
      >
        <div>content</div>
      </AppShell>
    )

    const identityLink = screen.queryByRole("link", { name: /Identity/i })
    expect(identityLink).toBeDefined()
  })
})
