// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

let currentPathname = "/account/security"

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
  usePathname: () => currentPathname,
}))

vi.mock("#components/sign-out-button", () => ({
  SignOutButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children ?? "Sign out"}
    </button>
  ),
}))

import { AccountOperatingShell } from "../../app/[locale]/(iam)/account/_components/account-operating-shell"

afterEach(() => {
  cleanup()
  currentPathname = "/account/security"
  window.location.hash = ""
})

const baseProps = {
  title: "Personal surface",
  railLabel: "Personal context rail",
  railDescription: "Persistent personal operating context.",
  sectionsLabel: "Context scopes",
  quickActionsLabel: "Quick actions",
  recentLabel: "Recent contexts",
  signalsLabel: "Signals",
  mobileTriggerLabel: "Open personal context",
  collapseRailLabel: "Collapse personal rail",
  expandRailLabel: "Expand personal rail",
  summary: {
    displayName: "Jason Doe",
    email: "jason@example.com",
    emailVerified: true,
    activeOrgName: "Demo Org",
    activeOrgRole: "admin",
    activeOrgHref: "/en/o/demo-org/nexus",
    orgCount: 1,
    sessionCount: 3,
  },
  sections: [
    {
      id: "identity" as const,
      label: "Identity",
      description: "Profile",
      href: "/en/account/identity",
      matchPath: "/account/identity",
    },
    {
      id: "sessions" as const,
      label: "Sessions",
      description: "Session access",
      href: "/en/account/security#sessions",
      matchPath: "/account/security",
    },
    {
      id: "security" as const,
      label: "Security",
      description: "Passkeys",
      href: "/en/account/security#security",
      matchPath: "/account/security",
    },
    {
      id: "workspace" as const,
      label: "Workspace",
      description: "Current org",
      href: "/en/o/demo-org/nexus",
    },
  ],
  quickActions: [
    {
      type: "link" as const,
      label: "Add passkey",
      description: "Open passkeys",
      href: "/en/account/security#passkeys",
    },
    {
      type: "signout" as const,
      label: "Sign out",
      description: "End session",
    },
  ],
  recentContexts: [
    {
      label: "Active workspace",
      value: "Demo Org",
      href: "/en/o/demo-org/nexus",
    },
  ],
  signals: [
    {
      label: "Verification",
      value: "Ready",
      tone: "positive" as const,
    },
  ],
}

describe("AccountOperatingShell", () => {
  it("marks Sessions active when the security route uses the sessions hash", () => {
    window.location.hash = "#sessions"

    render(
      <AccountOperatingShell {...baseProps}>
        <div>Security surface</div>
      </AccountOperatingShell>
    )

    expect(
      screen
        .getByRole("link", { name: /Sessions/i })
        .getAttribute("aria-current")
    ).toBe("page")
    expect(
      screen
        .getByRole("link", { name: /Security/i })
        .getAttribute("aria-current")
    ).toBeNull()
  })

  it("marks Identity active on the identity route", () => {
    currentPathname = "/account/identity"
    window.location.hash = ""

    render(
      <AccountOperatingShell {...baseProps}>
        <div>Identity surface</div>
      </AccountOperatingShell>
    )

    expect(
      screen
        .getByRole("link", { name: /Identity/i })
        .getAttribute("aria-current")
    ).toBe("page")
  })
})
