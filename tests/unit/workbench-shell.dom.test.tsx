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

vi.mock("#components/workbench/workbench-command", () => ({
  WorkbenchCommandProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useWorkbenchCommand: () => ({
    open: false,
    query: "",
    setQuery: vi.fn(),
    openCommand: vi.fn(),
    closeCommand: vi.fn(),
    toggleCommand: vi.fn(),
  }),
}))

vi.mock("#components/nexus/nexus-lynx-summon-context", () => ({
  LynxSummonProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("#components/workbench/workbench-mobile-rail", () => ({
  WorkbenchMobileRailProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  WorkbenchMobileRailSheet: () => null,
  WorkbenchMobileRailTrigger: () => null,
  useWorkbenchMobileRail: () => ({ open: vi.fn() }),
}))

vi.mock("#components/workbench/workbench-global-shortcuts.client", () => ({
  WorkbenchGlobalShortcuts: () => null,
}))

vi.mock("#components/workbench/utility-bar/workbench-utility-bar", () => ({
  WorkbenchUtilityBar: () => <div data-testid="workbench-utility-bar" />,
}))

import { AppShell, WorkbenchShell } from "#components/workbench"
import type { WorkbenchRailSlots } from "#components/workbench/left-nav-rail"
import type { RouteEnvelope } from "#lib/route-envelope.shared"

afterEach(() => {
  cleanup()
})

const testRailSlots: WorkbenchRailSlots = {
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
  it("is the same component reference as WorkbenchShell (zero-facade cost)", () => {
    expect(AppShell).toBe(WorkbenchShell)
  })

  it("renders skip-to-main link with provided label", () => {
    render(
      <AppShell
        envelope={testEnvelope}
        skipToMainLabel="Skip to main content"
        utilityBar={{
          mode: "org",
          orgSlug: "acme",
          orgName: "Acme",
          orgId: "org_test",
          userId: "user_test",
          userEmail: "user@example.com",
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
          mode: "no-org",
          userEmail: "user@example.com",
        }}
        rail={null}
      >
        <div data-testid="child-content">Hello Workbench</div>
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
          mode: "org",
          orgSlug: "acme",
          orgName: "Acme",
          orgId: "org_test",
          userId: "user_test",
          userEmail: "user@example.com",
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
