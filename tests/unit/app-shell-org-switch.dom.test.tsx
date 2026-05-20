// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const { switchActiveOrgAction, signOut, push, refresh } = vi.hoisted(() => ({
  switchActiveOrgAction: vi.fn(),
  signOut: vi.fn(async () => undefined),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("next/image", () => ({
  default: ({ fill: _fill, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element -- test stub for `next/image`
    <img alt="" {...props} />
  ),
}))

const TRANSLATIONS: Record<string, string> = {
  "Dashboard.shell.accountMenu.triggerAriaLabel": "Open control menu",
  "Dashboard.shell.accountMenu.triggerTooltip":
    "Account and workspace — open personal settings, information, security, open admin, or sign out.",
  "Dashboard.shell.accountMenu.title": "Account",
  "Dashboard.shell.accountMenu.profileLabel": "Profile",
  "Dashboard.shell.accountMenu.profileDescription":
    "Identity and contact details.",
  "Dashboard.shell.accountMenu.accountSettingsLabel": "Account & settings",
  "Dashboard.shell.accountMenu.accountSettingsDescription":
    "Personal overview, next steps, and workspace context.",
  "Dashboard.shell.accountMenu.securityLabel": "Security",
  "Dashboard.shell.accountMenu.securityDescription":
    "Password, sessions, and sign-in.",
  "Dashboard.shell.accountMenu.helpCenterLabel": "Help center",
  "Dashboard.shell.accountMenu.helpCenterDescription":
    "Documentation and guides.",
  "Dashboard.shell.accountMenu.privacyLabel": "Privacy",
  "Dashboard.shell.accountMenu.privacyDescription": "How we handle your data.",
  "Dashboard.shell.accountMenu.signOut": "Sign out",
  "Dashboard.shell.accountMenu.signOutDescription":
    "End this session on this device.",
  "Dashboard.shell.accountMenu.footer": "Signed in",
  "Dashboard.shell.accountMenu.defaultSubtitle": "Signed in",
  "Dashboard.shell.orgSwitcher.trigger": "Switch organization",
  "Dashboard.shell.orgSwitcher.triggerTooltip":
    "Choose which organization you are working in. Your next action uses this organization’s data and audit scope.",
  "Dashboard.shell.orgSwitcher.menuHeading": "Your organizations",
  "Dashboard.shell.orgSwitcher.role.member": "Member",
  "Dashboard.shell.orgSwitcher.role.admin": "Admin",
  "Dashboard.shell.orgSwitcher.role.owner": "Owner",
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    TRANSLATIONS[`${namespace}.${key}`] ?? `${namespace}.${key}`,
  useLocale: () => "en",
}))

vi.mock("#features/org-admin/client", () => ({
  switchActiveOrgAction: (targetOrgId: string) =>
    switchActiveOrgAction(targetOrgId),
}))

vi.mock("#lib/auth-client", () => ({
  authClient: {
    signOut,
  },
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
  useRouter: () => ({
    push,
    refresh,
  }),
}))

import { AppShellOrgCompanySwitch } from "#app-shell/client"
import { AppShellAccountDropdown } from "#app-shell/client"
import { TooltipProvider } from "#components2/ui/tooltip"

function renderWithTooltipProvider(node: ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>)
}

afterEach(() => {
  cleanup()
  switchActiveOrgAction.mockReset()
  signOut.mockClear()
  push.mockClear()
  refresh.mockClear()
})

describe("Workbench org switch surfaces", () => {
  it("opens the left utility org switcher and switches through the server action", async () => {
    renderWithTooltipProvider(
      <AppShellOrgCompanySwitch
        orgId="org-demo"
        orgName="Demo Organization"
        userOrgs={[
          {
            id: "org-demo",
            slug: "demo-org",
            name: "Demo Organization",
            logo: null,
            role: "owner",
          },
          {
            id: "org-target",
            slug: "target-org",
            name: "Target Organization",
            logo: null,
            role: "admin",
          },
        ]}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Switch organization" }))

    expect(await screen.findByText("Your organizations")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: /Demo Organization/i })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: /Target Organization/i })
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole("button", { name: /Target Organization/i })
    )

    expect(switchActiveOrgAction).toHaveBeenCalledWith("org-target")
  })

  it("keeps the account menu free of organization switching actions", async () => {
    renderWithTooltipProvider(
      <AppShellAccountDropdown
        hrefs={{
          account: "/en/o/acme/iam-profile",
          identity: "/en/o/acme/iam-profile/identity",
          security: "/en/o/acme/iam-profile/security",
        }}
        userEmail="owner@afenda.com"
        subtitle="Demo Organization"
        triggerAriaLabel="Open control menu"
      />
    )

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Open control menu" }),
      {
        button: 0,
        ctrlKey: false,
      }
    )

    expect(await screen.findByText("Demo Organization")).toBeTruthy()
    expect(screen.getByRole("menuitem", { name: /^Profile/ })).toBeTruthy()
    expect(
      screen.queryByRole("menuitem", { name: /switch organization/i })
    ).toBeNull()
    expect(screen.queryByText("Your organizations")).toBeNull()
  })
})
