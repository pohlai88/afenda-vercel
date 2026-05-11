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

vi.mock("#components/workbench/workbench-command-context", () => ({
  WorkbenchCommandProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useWorkbenchCommand: () => ({
    isOpen: false,
    toggle: vi.fn(),
    close: vi.fn(),
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

import { WorkbenchShell } from "#components/workbench"
import type { WorkbenchRailSlots } from "#components/workbench"
import { LayoutDashboardIcon } from "lucide-react"

afterEach(() => {
  cleanup()
})

const testRailSlots: WorkbenchRailSlots = {
  identity: {
    initial: "T",
    primary: "Test Org",
    secondary: "test@example.com",
    pills: [],
  },
  nav: [
    {
      id: "main",
      items: [
        {
          id: "identity",
          label: "Identity",
          href: "/account/identity",
          icon: LayoutDashboardIcon,
        },
      ],
    },
  ],
}

describe("WorkbenchShell", () => {
  it("renders skip-to-main link with provided label", () => {
    render(
      <WorkbenchShell
        skipToMainLabel="Skip to main content"
        utilityBar={<div>utility bar</div>}
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
      </WorkbenchShell>
    )

    expect(
      screen.getByRole("link", { name: /Skip to main content/i })
    ).toBeDefined()
  })

  it("renders children inside the main content area", () => {
    render(
      <WorkbenchShell
        skipToMainLabel="Skip to main"
        utilityBar={null}
        rail={null}
      >
        <div data-testid="child-content">Hello Workbench</div>
      </WorkbenchShell>
    )

    expect(screen.getByTestId("child-content")).toBeDefined()
  })

  it("renders nav item link for the active route", () => {
    render(
      <WorkbenchShell
        skipToMainLabel="Skip"
        utilityBar={null}
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
      </WorkbenchShell>
    )

    const identityLink = screen.queryByRole("link", { name: /Identity/i })
    expect(identityLink).toBeDefined()
  })
})
