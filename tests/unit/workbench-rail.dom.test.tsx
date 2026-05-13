// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let currentPathname = "/account/identity"

vi.mock("#i18n/navigation", () => ({
  Link: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    prefetch?: boolean
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn() }),
}))

// Pass-through tooltip stubs — exercise the trigger DOM directly without
// requiring a TooltipProvider in tests.
vi.mock("#components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({
    asChild,
    children,
    ...props
  }: { asChild?: boolean; children: React.ReactNode } & Record<
    string,
    unknown
  >) =>
    asChild ? (
      (children as React.ReactElement)
    ) : (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div role="tooltip" data-tooltip-content="true">
      {children}
    </div>
  ),
}))

vi.mock("#components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    asChild,
    children,
  }: {
    asChild?: boolean
    children: React.ReactNode
  }) => (asChild ? (children as React.ReactElement) : <div>{children}</div>),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-nav-search">{children}</div>
  ),
}))

// Stable next-intl stubs — the recents section uses `useNow` /
// `useFormatter().relativeTime`. Tests pin "now" to a known date so
// the produced relative-time strings are deterministic and the
// `<time dateTime>` reflects the kernel's `occurredAt` ISO string.
const FIXED_NOW = new Date("2026-05-12T12:00:00.000Z")

vi.mock("next-intl", () => ({
  useNow: () => FIXED_NOW,
  useFormatter: () => ({
    relativeTime: (date: Date | string) => {
      const target = typeof date === "string" ? new Date(date) : date
      const ms = FIXED_NOW.getTime() - target.getTime()
      const minute = 60_000
      const hour = 60 * minute
      const day = 24 * hour
      if (ms < minute) return "just now"
      if (ms < hour) return `${Math.floor(ms / minute)}m ago`
      if (ms < day) return `${Math.floor(ms / hour)}h ago`
      return `${Math.floor(ms / day)}d ago`
    },
  }),
}))

import {
  WorkbenchRail,
  WorkbenchRailFooter,
  isWorkbenchRailNavItemActive,
  parseWorkbenchRailInbox,
  parseWorkbenchRailLabels,
  parseWorkbenchRailNavChildItem,
  parseWorkbenchRailNavItem,
  parseWorkbenchRailPin,
  parseWorkbenchRailRecent,
  parseWorkbenchRailSlotsData,
  parseWorkbenchRailView,
} from "#components/workbench/left-nav-rail"
import {
  WorkbenchRailCollapseUiProvider,
  WORKBENCH_RAIL_NAV_DOM_ID,
  type WorkbenchRailCollapseApi,
} from "#components/workbench/workbench-rail-collapse-context"
import type {
  WorkbenchRailLabels,
  WorkbenchRailSlots,
} from "#components/workbench/left-nav-rail"

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  currentPathname = "/account/identity"
})

const baseLabels: WorkbenchRailLabels = {
  ariaLabel: "Operator rail",
  collapseLabel: "Collapse rail",
  expandLabel: "Expand rail",
}

const baseSlots: WorkbenchRailSlots = {
  nav: [
    {
      id: "primary",
      items: [
        {
          id: "identity",
          label: "Identity",
          href: "/account/identity",
          icon: "user-round",
        },
        {
          id: "orbit",
          label: "Orbit",
          href: "/account/orbit",
          icon: "activity",
          badge: { count: 4, tone: "attention" },
        },
        {
          id: "security",
          label: "Security",
          href: "/account/security",
          icon: "shield",
        },
      ],
    },
  ],
}

function renderRail({
  collapsed = false,
  interactionMode,
  slots = baseSlots,
  labels = baseLabels,
}: {
  collapsed?: boolean
  interactionMode?: "expanded" | "collapsed" | "hover"
  slots?: WorkbenchRailSlots
  labels?: WorkbenchRailLabels
} = {}) {
  return render(
    <WorkbenchRail
      slots={slots}
      labels={labels}
      collapsed={collapsed}
      interactionMode={interactionMode}
    />
  )
}

// ---------------------------------------------------------------------------
// isWorkbenchRailNavItemActive — pure
// ---------------------------------------------------------------------------

describe("isWorkbenchRailNavItemActive", () => {
  it("honors a caller-forced active flag", () => {
    expect(
      isWorkbenchRailNavItemActive({ active: true, href: "/x" }, "/y")
    ).toBe(true)
    expect(
      isWorkbenchRailNavItemActive({ active: false, href: "/y" }, "/y")
    ).toBe(false)
  })

  it("matches an exact href without `match`", () => {
    expect(isWorkbenchRailNavItemActive({ href: "/orbit" }, "/orbit")).toBe(
      true
    )
  })

  it("treats default mode as prefix at segment boundaries", () => {
    expect(
      isWorkbenchRailNavItemActive({ href: "/orbit" }, "/orbit/queue")
    ).toBe(true)
    // Sibling routes that share a prefix must NOT activate.
    expect(isWorkbenchRailNavItemActive({ href: "/orbit" }, "/orbit-2")).toBe(
      false
    )
    expect(isWorkbenchRailNavItemActive({ href: "/orbit" }, "/orbital")).toBe(
      false
    )
  })

  it('match: "exact" rejects subpaths', () => {
    expect(
      isWorkbenchRailNavItemActive(
        { href: "/orbit", match: "exact" },
        "/orbit/queue"
      )
    ).toBe(false)
    expect(
      isWorkbenchRailNavItemActive({ href: "/orbit", match: "exact" }, "/orbit")
    ).toBe(true)
  })

  it("activates when any `activePatterns` matches", () => {
    expect(
      isWorkbenchRailNavItemActive(
        {
          href: "/admin/audit",
          activePatterns: ["/admin/audit-export"],
        },
        "/admin/audit-export/2026"
      )
    ).toBe(true)
  })

  it("never matches absolute URL patterns", () => {
    expect(
      isWorkbenchRailNavItemActive(
        { href: "/admin", activePatterns: ["https://example.com/admin"] },
        "https://example.com/admin"
      )
    ).toBe(false)
  })

  it("never infers active state from query-string targets", () => {
    expect(
      isWorkbenchRailNavItemActive(
        { href: "/orbit?lifecycle=blocked" },
        "/orbit"
      )
    ).toBe(false)
  })

  it("never infers active state from hash targets", () => {
    expect(
      isWorkbenchRailNavItemActive(
        { href: "/account/security#sessions" },
        "/account/security"
      )
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Schema parsers
// ---------------------------------------------------------------------------

describe("workbench-rail.schema", () => {
  it("accepts a valid nav item", () => {
    const parsed = parseWorkbenchRailNavItem({
      id: "identity",
      label: "Identity",
      href: "/account/identity",
      icon: "user-round",
    })
    expect(parsed.icon).toBe("user-round")
    expect(parsed.match).toBeUndefined()
  })

  it("accepts strict child nav items for nested menus", () => {
    const parsed = parseWorkbenchRailNavChildItem({
      id: "orbit-today",
      label: "Today",
      href: "/account/orbit/today",
      match: "exact",
    })

    expect(parsed.match).toBe("exact")
    expect(() =>
      parseWorkbenchRailNavChildItem({
        id: "orbit-today",
        label: "Today",
        href: "/account/orbit/today",
        icon: "activity",
      })
    ).toThrow()
  })

  it("rejects an unknown icon id at runtime", () => {
    expect(() =>
      parseWorkbenchRailNavItem({
        id: "x",
        label: "X",
        href: "/x",
        icon: "not-a-real-icon",
      })
    ).toThrow()
  })

  it("rejects an empty label/href", () => {
    expect(() =>
      parseWorkbenchRailNavItem({
        id: "x",
        label: "",
        href: "/x",
        icon: "user-round",
      })
    ).toThrow()
  })

  it("validates the full slots data shape (identity optional)", () => {
    const legacy = parseWorkbenchRailSlotsData({
      identity: { initial: "A", primary: "Org" },
      nav: [],
    })
    expect(legacy.identity?.primary).toBe("Org")

    const slim = parseWorkbenchRailSlotsData({ nav: [] })
    expect(slim.identity).toBeUndefined()
  })

  it("rejects retired decorative slots — pills / context / labels.description", () => {
    // Phase 1 of the Working Memory Rail migration removed these fields. The
    // kernel must refuse them at runtime so stale registry payloads, remote
    // manifests, or untrusted CMS data cannot resurrect decorative chrome.
    expect(() =>
      parseWorkbenchRailSlotsData({
        identity: {
          initial: "A",
          primary: "Org",
          pills: [{ label: "Verified", tone: "positive" }],
        },
        nav: [],
      })
    ).toThrow()
    expect(() =>
      parseWorkbenchRailSlotsData({
        identity: { initial: "A", primary: "Org" },
        nav: [],
        context: [
          {
            id: "ops",
            label: "Operations",
            items: [{ label: "Workspace", value: "Malaysia Ops" }],
          },
        ],
      })
    ).toThrow()
    expect(() =>
      parseWorkbenchRailLabels({
        ariaLabel: "Rail",
        collapseLabel: "Collapse",
        expandLabel: "Expand",
        description: "Decorative description",
      })
    ).toThrow()
  })

  it("validates labels with optional emptyState", () => {
    const parsed = parseWorkbenchRailLabels({
      ariaLabel: "Rail",
      collapseLabel: "Collapse",
      expandLabel: "Expand",
      emptyState: "Empty",
    })
    expect(parsed.emptyState).toBe("Empty")
  })

  it("requires nav-item badge.tone — Phase 2 semantic-tone kernel mutation", () => {
    // Per Phase 2 of the Working Memory Rail (`working-memory-rail-plan.md`
    // §10 anti-patterns): "Pressure badges carry semantic tone, not raw
    // integers." A badge with only `count` is a doctrine violation — every
    // emitted badge must declare operator-readable urgency.
    expect(() =>
      parseWorkbenchRailNavItem({
        id: "x",
        label: "Members",
        href: "/x",
        icon: "users",
        badge: { count: 3 },
      })
    ).toThrow()
    expect(() =>
      parseWorkbenchRailNavItem({
        id: "x",
        label: "Members",
        href: "/x",
        icon: "users",
        badge: { count: 3, tone: "purple" }, // not in tone vocabulary
      })
    ).toThrow()
    const parsed = parseWorkbenchRailNavItem({
      id: "x",
      label: "Members",
      href: "/x",
      icon: "users",
      badge: { count: 3, tone: "attention" },
    })
    expect(parsed.badge?.tone).toBe("attention")
  })

  it("rejects unknown keys on nav badges — strict kernel", () => {
    // Strict object guard blocks resurrected decorative keys (label,
    // description) from creeping back into the badge contract.
    expect(() =>
      parseWorkbenchRailNavItem({
        id: "x",
        label: "Members",
        href: "/x",
        icon: "users",
        badge: { count: 3, tone: "attention", label: "decorative" },
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Working Memory Rail (Phase 3a) — inbox, pinned, views, recents parsers
// ---------------------------------------------------------------------------

describe("workbench-rail.schema (Working Memory Rail)", () => {
  it("inbox: accepts a valid inbox slot with pressure tone", () => {
    const parsed = parseWorkbenchRailInbox({
      label: "Pending invitations",
      count: 12,
      href: "/o/acme/admin/members?status=pending",
      tone: "attention",
    })
    expect(parsed.count).toBe(12)
    expect(parsed.tone).toBe("attention")
  })

  it("inbox: rejects count = 0 — empty memory must omit the slot", () => {
    // Doctrinal: a zero-count inbox is "Access health = Ready" chrome.
    // The kernel enforces conditional density at parse time so builders
    // cannot silently emit dead pressure.
    expect(() =>
      parseWorkbenchRailInbox({
        label: "Pending invitations",
        count: 0,
        href: "/x",
        tone: "default",
      })
    ).toThrow()
  })

  it("inbox: rejects missing tone — every pressure summary declares urgency", () => {
    expect(() =>
      parseWorkbenchRailInbox({
        label: "Pending invitations",
        count: 4,
        href: "/x",
      })
    ).toThrow()
  })

  it("inbox: rejects unknown keys — strict kernel", () => {
    expect(() =>
      parseWorkbenchRailInbox({
        label: "Pending invitations",
        count: 4,
        href: "/x",
        tone: "attention",
        description: "decorative",
      })
    ).toThrow()
  })

  it("pin: accepts a valid pin with optional icon", () => {
    const parsed = parseWorkbenchRailPin({
      id: "pin-1",
      label: "Aisha Khan",
      href: "/o/acme/dashboard/hrm/employees/emp-1",
      icon: "user-round",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
    })
    expect(parsed.resourceType).toBe("hrm_employee")
    expect(parsed.icon).toBe("user-round")
  })

  it("pin: rejects an unknown icon id", () => {
    expect(() =>
      parseWorkbenchRailPin({
        id: "pin-1",
        label: "X",
        href: "/x",
        icon: "definitely-not-a-real-icon",
        resourceType: "hrm_employee",
        resourceId: "emp-1",
      })
    ).toThrow()
  })

  it("pin: rejects unknown keys — strict kernel", () => {
    expect(() =>
      parseWorkbenchRailPin({
        id: "pin-1",
        label: "Aisha Khan",
        href: "/x",
        resourceType: "hrm_employee",
        resourceId: "emp-1",
        description: "decorative",
      })
    ).toThrow()
  })

  it("view: accepts a valid saved view", () => {
    const parsed = parseWorkbenchRailView({
      id: "view-1",
      label: "Active L3 engineers",
      href: "/o/acme/dashboard/hrm/employees?status=active&grade=L3",
      icon: "list",
    })
    expect(parsed.href).toContain("status=active")
  })

  it("view: rejects empty label / href", () => {
    expect(() =>
      parseWorkbenchRailView({
        id: "view-1",
        label: "",
        href: "/x",
      })
    ).toThrow()
    expect(() =>
      parseWorkbenchRailView({
        id: "view-1",
        label: "X",
        href: "",
      })
    ).toThrow()
  })

  it("recent: accepts a valid recent with ISO occurredAt + record id", () => {
    const parsed = parseWorkbenchRailRecent({
      id: "rec-1",
      label: "Aisha Khan",
      href: "/o/acme/dashboard/hrm/employees/emp-1",
      icon: "user-round",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
      occurredAt: "2026-05-12T03:14:15.000Z",
    })
    expect(parsed.resourceId).toBe("emp-1")
  })

  it("recent: accepts a list-level recent without resourceId", () => {
    // Index surfaces (e.g. "Members") have a stable href but no record id.
    const parsed = parseWorkbenchRailRecent({
      id: "rec-2",
      label: "Members",
      href: "/o/acme/admin/members",
      resourceType: "org_member_list",
      occurredAt: "2026-05-12T03:14:15.000Z",
    })
    expect(parsed.resourceId).toBeUndefined()
  })

  it("recent: rejects an invalid occurredAt (non-ISO)", () => {
    expect(() =>
      parseWorkbenchRailRecent({
        id: "rec-3",
        label: "X",
        href: "/x",
        resourceType: "hrm_employee",
        occurredAt: "yesterday",
      })
    ).toThrow()
  })

  it("recent: rejects unknown keys — strict kernel", () => {
    expect(() =>
      parseWorkbenchRailRecent({
        id: "rec-4",
        label: "X",
        href: "/x",
        resourceType: "hrm_employee",
        occurredAt: "2026-05-12T03:14:15.000Z",
        description: "decorative",
      })
    ).toThrow()
  })

  it("recent: rejects audit-namespace labels — continuity memory, not audit logs", () => {
    // Doctrinal: recent labels must read as operator memory. A label of
    // "erp.contact.record.create" is an audit action string and belongs
    // in `iam_audit_event`, not in the rail. Same for every canonical
    // namespace prefix per ORG_ADMIN_EVENT_NAMESPACES.
    const forbidden = [
      "iam.user.role.update",
      "org.import.job.create",
      "erp.contact.record.create",
      "governance.audit.export.run",
      "integration.endpoint.delete",
      "workflow.run.complete",
      "system.cron.tick",
    ]
    for (const label of forbidden) {
      expect(() =>
        parseWorkbenchRailRecent({
          id: "rec-x",
          label,
          href: "/x",
          resourceType: "hrm_employee",
          occurredAt: "2026-05-12T03:14:15.000Z",
        })
      ).toThrow()
    }
    // Sanity: ergonomic prose containing the namespace prefix as part
    // of a real word is still accepted ("ergonomics", "organic", etc.).
    const accepted = parseWorkbenchRailRecent({
      id: "rec-y",
      label: "Ergonomics review · edited 12m ago",
      href: "/x",
      resourceType: "hrm_employee",
      occurredAt: "2026-05-12T03:14:15.000Z",
    })
    expect(accepted.label).toContain("Ergonomics")
  })

  it("slots: accepts a fully populated Working Memory Rail payload", () => {
    const parsed = parseWorkbenchRailSlotsData({
      nav: [],
      inbox: {
        label: "Open approvals",
        count: 3,
        href: "/o/acme/dashboard/hrm/approvals",
        tone: "attention",
      },
      pinned: [
        {
          id: "pin-1",
          label: "Aisha Khan",
          href: "/o/acme/dashboard/hrm/employees/emp-1",
          resourceType: "hrm_employee",
          resourceId: "emp-1",
        },
      ],
      views: [
        {
          id: "view-1",
          label: "Active L3 engineers",
          href: "/o/acme/dashboard/hrm/employees?status=active&grade=L3",
        },
      ],
      recents: [
        {
          id: "rec-1",
          label: "Aisha Khan",
          href: "/o/acme/dashboard/hrm/employees/emp-1",
          resourceType: "hrm_employee",
          resourceId: "emp-1",
          occurredAt: "2026-05-12T03:14:15.000Z",
        },
      ],
    })
    expect(parsed.inbox?.count).toBe(3)
    expect(parsed.pinned).toHaveLength(1)
    expect(parsed.views).toHaveLength(1)
    expect(parsed.recents).toHaveLength(1)
  })

  it("slots: rejects empty pinned / views / recents arrays — kernel-level conditional density", () => {
    // Doctrinal: empty memory must be expressed by *omitting* the slot,
    // not by emitting an empty array. The kernel refuses the latter so a
    // hollow "Pinned (0)" frame can never render.
    expect(() =>
      parseWorkbenchRailSlotsData({
        nav: [],
        pinned: [],
      })
    ).toThrow()
    expect(() =>
      parseWorkbenchRailSlotsData({
        nav: [],
        views: [],
      })
    ).toThrow()
    expect(() =>
      parseWorkbenchRailSlotsData({
        nav: [],
        recents: [],
      })
    ).toThrow()
  })

  it("slots: rejects recents arrays beyond 5 entries", () => {
    const oneRecent = (id: string) => ({
      id,
      label: "X",
      href: "/x",
      resourceType: "hrm_employee",
      occurredAt: "2026-05-12T03:14:15.000Z",
    })
    expect(() =>
      parseWorkbenchRailSlotsData({
        nav: [],
        recents: [
          oneRecent("r1"),
          oneRecent("r2"),
          oneRecent("r3"),
          oneRecent("r4"),
          oneRecent("r5"),
          oneRecent("r6"),
        ],
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Rendering — expanded
// ---------------------------------------------------------------------------

describe("WorkbenchRail (expanded)", () => {
  it("renders nav search chrome and primary nav links", () => {
    renderRail()

    expect(screen.getByRole("search")).toBeDefined()
    expect(screen.getByRole("searchbox")).toBeDefined()
    expect(screen.getByRole("link", { name: /identity/i })).toBeDefined()
    expect(screen.getByRole("link", { name: /orbit/i })).toBeDefined()
    expect(screen.getByRole("navigation").className).toContain(
      "af-workbench-rail-scroll"
    )
    expect(screen.getByRole("navigation").className).not.toContain(
      "no-scrollbar"
    )
  })

  it("renders nested nav children behind an item-level menu trigger", () => {
    currentPathname = "/account/orbit/today"
    renderRail({
      slots: {
        nav: [
          {
            id: "primary",
            items: [
              {
                id: "orbit",
                label: "Orbit",
                href: "/account/orbit",
                icon: "activity",
                items: [
                  {
                    id: "orbit-queue",
                    label: "Queue",
                    href: "/account/orbit",
                    match: "exact",
                  },
                  {
                    id: "orbit-today",
                    label: "Today",
                    href: "/account/orbit/today",
                  },
                ],
              },
            ],
          },
        ],
      },
    })

    const orbitLink = screen.getByRole("link", { name: /orbit/i })
    const todayLink = screen.getByRole("link", { name: /^today$/i })

    expect(
      screen.getByRole("button", { name: /toggle orbit menu/i })
    ).toBeDefined()
    expect(orbitLink.getAttribute("data-active")).toBe("true")
    expect(orbitLink.getAttribute("aria-current")).toBeNull()
    expect(todayLink.getAttribute("aria-current")).toBe("page")
  })

  it("filters primary nav when the search query is typed", () => {
    renderRail()
    const input = screen.getByRole("searchbox")
    fireEvent.change(input, { target: { value: "orbit" } })

    expect(screen.queryByRole("link", { name: /identity/i })).toBeNull()
    expect(screen.getByRole("link", { name: /orbit/i })).toBeDefined()
  })

  it("shows no-matches status when the filter excludes every nav item", () => {
    renderRail()
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz" },
    })

    const status = screen.getByRole("status")
    expect(status.textContent).toMatch(/no links match/i)
  })

  it("does not render decorative pills, context strip, or status footer", () => {
    // The rail is nav filter → primary execution nav → optional caller footer →
    // collapse. There is no built-in pill list, context strip, or
    // hardcoded "Online / secure session" footer block.
    renderRail()

    expect(screen.queryByRole("list", { name: /identity signals/i })).toBeNull()
    expect(screen.queryByRole("region", { name: /operations/i })).toBeNull()
    expect(screen.queryByText(/online · secure session/i)).toBeNull()
    expect(screen.queryByText(/online/i)).toBeNull()
  })

  it("marks the active route with aria-current and data-active", () => {
    currentPathname = "/account/orbit"
    renderRail()

    const orbitLink = screen.getByRole("link", { name: /orbit/i })
    expect(orbitLink.getAttribute("aria-current")).toBe("page")
    expect(orbitLink.getAttribute("data-active")).toBe("true")

    const identityLink = screen.getByRole("link", { name: /identity/i })
    expect(identityLink.getAttribute("aria-current")).toBeNull()
    expect(identityLink.getAttribute("data-active")).toBeNull()
  })

  it("does not activate sibling prefixes", () => {
    // Manufactured sibling: /account/orbit-2 should not activate /account/orbit
    currentPathname = "/account/orbit-2"
    renderRail()

    const orbitLink = screen.getByRole("link", { name: /orbit/i })
    expect(orbitLink.getAttribute("aria-current")).toBeNull()
  })

  it("renders badges with an accessible count", () => {
    renderRail()
    const orbitLink = screen.getByRole("link", { name: /orbit/i })
    // sr-only "(N items)" text composed inside the link
    expect(orbitLink.textContent).toMatch(/4 items/i)
  })
})

// ---------------------------------------------------------------------------
// Rendering — collapsed
// ---------------------------------------------------------------------------

describe("WorkbenchRail (collapsed)", () => {
  it("renders a compact nav search trigger with an accessible label", () => {
    renderRail({ collapsed: true })

    expect(
      screen.getByRole("button", { name: /open navigation filter/i })
    ).toBeDefined()
  })

  it("exposes collapsed rail icon tooltips via TooltipContent", () => {
    renderRail({ collapsed: true })

    const tooltips = screen.getAllByRole("tooltip")
    // Search trigger + 3 nav items.
    expect(tooltips.length).toBe(4)
    expect(tooltips.map((node) => node.textContent).join(" ")).toContain(
      "Open navigation filter"
    )
  })

  it("composes the badge count into the link's accessible name", () => {
    renderRail({ collapsed: true })

    const orbitLink = screen.getByRole("link", { name: /orbit/i })
    expect(orbitLink.getAttribute("aria-label")).toMatch(/4 items/i)
  })

  it("centers collapsed nav icons on the rail icon column", () => {
    renderRail({ collapsed: true })

    const identityLink = screen.getByRole("link", { name: /identity/i })
    expect(identityLink.className).toContain("mx-auto")
    expect(identityLink.className).toContain("size-8")
  })

  it("temporarily expands in hover interaction mode", () => {
    const { container } = renderRail({
      collapsed: true,
      interactionMode: "hover",
    })
    const rail = container.querySelector("[data-workbench-rail='true']")

    expect(rail?.getAttribute("data-collapsed")).toBe("true")
    expect(
      screen.getByRole("button", { name: /open navigation filter/i })
    ).toBeDefined()

    fireEvent.pointerEnter(rail!)

    expect(rail?.getAttribute("data-collapsed")).toBe("false")
    expect(screen.getByRole("searchbox")).toBeDefined()

    fireEvent.pointerLeave(rail!)

    expect(rail?.getAttribute("data-collapsed")).toBe("true")
  })
})

// ---------------------------------------------------------------------------
// Footer slot
// ---------------------------------------------------------------------------

describe("WorkbenchRail footer slot", () => {
  it("renders a caller-supplied footer when provided", () => {
    renderRail({
      slots: {
        ...baseSlots,
        footer: <button type="button">Sign out</button>,
      },
    })
    expect(screen.getByRole("button", { name: /sign out/i })).toBeDefined()
  })

  it("WorkbenchRailFooter tracks hover-expanded visual width for identity labels", () => {
    const shellApi: WorkbenchRailCollapseApi = {
      collapsed: true,
      setCollapsed: vi.fn(),
      mode: "hover",
      setMode: vi.fn(),
      toggleCollapse: vi.fn(),
      collapseLabel: "Collapse",
      expandLabel: "Expand",
      controlsNavId: WORKBENCH_RAIL_NAV_DOM_ID,
    }
    const { container } = render(
      <WorkbenchRailCollapseUiProvider shellApi={shellApi}>
        <WorkbenchRail
          slots={{
            ...baseSlots,
            footer: (
              <WorkbenchRailFooter
                avatarLabel="Alex Operator"
                primaryLabel="Alex Operator"
                secondaryLabel="alex@example.com"
                labels={{
                  sidebarControl: "Rail layout",
                  expanded: "Always expanded",
                  expandedHelp: "Use the full-width rail.",
                  collapsed: "Collapsed",
                  collapsedHelp: "Use the compact rail.",
                  expandOnHover: "Hover expand",
                  expandOnHoverHelp: "Expand the rail while hovering.",
                  current: "Current",
                }}
              />
            ),
          }}
          labels={baseLabels}
          collapsed={true}
          interactionMode="hover"
        />
      </WorkbenchRailCollapseUiProvider>
    )
    const primary = screen
      .getAllByText("Alex Operator")
      .find((node) => node.tagName.toLowerCase() === "p")
    const tooltipText = screen
      .getAllByRole("tooltip")
      .map((node) => node.textContent)
      .join(" ")
    expect(primary).toBeDefined()
    expect(tooltipText).toContain("Alex Operator")
    expect(tooltipText).toContain("alex@example.com")
    const primaryElement = primary!
    expect(primaryElement.closest(".sr-only")).not.toBeNull()
    const rail = container.querySelector("[data-workbench-rail='true']")
    fireEvent.pointerEnter(rail!)
    expect(primaryElement.closest(".sr-only")).toBeNull()
    fireEvent.pointerLeave(rail!)
    expect(primaryElement.closest(".sr-only")).not.toBeNull()
  })

  it("renders nothing in place of the footer when omitted (no hardcoded status block)", () => {
    renderRail()
    // No green dot, no status uppercase chrome, no aria-live polite region.
    expect(document.querySelector("[aria-live='polite']")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("WorkbenchRail empty state", () => {
  it("shows the default copy when permission filtering removes every nav item", () => {
    renderRail({
      slots: {
        ...baseSlots,
        nav: [{ id: "primary", items: [] }],
      },
    })

    const status = screen.getByRole("status")
    expect(status.textContent).toMatch(/no surfaces available/i)
    expect(status.getAttribute("data-rail-empty")).toBe("true")
  })

  it("uses the caller-supplied empty label when provided", () => {
    renderRail({
      slots: { ...baseSlots, nav: [] },
      labels: {
        ...baseLabels,
        emptyState: "You don't have access to any surfaces yet.",
      },
    })

    expect(
      screen.getByText(/you don't have access to any surfaces yet/i)
    ).toBeDefined()
  })

  it("shows a non-text empty marker when collapsed", () => {
    renderRail({
      collapsed: true,
      slots: { ...baseSlots, nav: [] },
    })

    expect(screen.queryByRole("status")).toBeNull()
    const marker = document.querySelector('[data-rail-empty="true"]')
    expect(marker).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Working Memory Rail (Phase 3c) — section renderers
// ---------------------------------------------------------------------------

const HRM_NAV: WorkbenchRailSlots["nav"] = [
  {
    id: "hrm",
    label: "HRM",
    items: [
      {
        id: "overview",
        label: "Overview",
        href: "/o/acme/dashboard/hrm",
        icon: "layout-dashboard",
      },
      {
        id: "employees",
        label: "Employees",
        href: "/o/acme/dashboard/hrm/employees",
        icon: "users",
      },
    ],
  },
]

const FULL_MEMORY_SLOTS: WorkbenchRailSlots = {
  nav: HRM_NAV,
  inbox: {
    label: "Open approvals",
    count: 3,
    href: "/o/acme/dashboard/hrm/approvals",
    tone: "attention",
  },
  pinned: [
    {
      id: "pin-1",
      label: "Aisha Khan",
      href: "/o/acme/dashboard/hrm/employees/emp-1",
      icon: "user-round",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
    },
    {
      id: "pin-2",
      label: "Q3 payroll review",
      href: "/o/acme/dashboard/hrm/payroll/q3-2026",
      resourceType: "hrm_payroll_period",
      resourceId: "q3-2026",
    },
  ],
  views: [
    {
      id: "view-1",
      label: "Active L3 engineers",
      href: "/o/acme/dashboard/hrm/employees?status=active&grade=L3",
      icon: "list",
    },
  ],
  recents: [
    {
      id: "rec-1",
      label: "Marcus Tan",
      href: "/o/acme/dashboard/hrm/employees/emp-2",
      icon: "user-round",
      resourceType: "hrm_employee",
      resourceId: "emp-2",
      // 5 minutes before FIXED_NOW
      occurredAt: "2026-05-12T11:55:00.000Z",
    },
    {
      id: "rec-2",
      label: "Leave policy 2026",
      href: "/o/acme/dashboard/hrm/leave/policy-2026",
      resourceType: "hrm_leave_policy",
      resourceId: "policy-2026",
      // 1 hour before
      occurredAt: "2026-05-12T11:00:00.000Z",
    },
    {
      id: "rec-3",
      label: "Members",
      href: "/o/acme/admin/members",
      resourceType: "org_member_list",
      // 26 hours before -> "1d ago"
      occurredAt: "2026-05-11T10:00:00.000Z",
    },
  ],
}

// -- Inbox -------------------------------------------------------------

describe("WorkbenchRail inbox section", () => {
  it("renders the inbox row with label, count, and tone class when slot present (expanded)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const section = document.querySelector('[data-rail-section="inbox"]')
    expect(section).not.toBeNull()
    expect(section?.getAttribute("data-rail-section-tone")).toBe("attention")

    const link = screen.getByRole("link", { name: /open approvals/i })
    expect(link.getAttribute("href")).toBe("/o/acme/dashboard/hrm/approvals")
    expect(link.textContent).toMatch(/3/)
    expect(link.textContent).toMatch(/3 items/i)
  })

  it("hides entirely when slot is absent — no decorative chrome", () => {
    renderRail()

    expect(document.querySelector('[data-rail-section="inbox"]')).toBeNull()
  })

  it("survives collapse with icon-only badge — pressure stays visible below 72px", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS, collapsed: true })

    const section = document.querySelector('[data-rail-section="inbox"]')
    expect(section).not.toBeNull()

    const link = screen.getByRole("link", { name: /open approvals/i })
    // accessible name carries item count, full label hidden visually
    expect(link.getAttribute("aria-label")).toMatch(/open approvals/i)
    expect(link.getAttribute("aria-label")).toMatch(/3 items/i)

    // Collapsed badge attached to icon glyph
    const badge = link.querySelector('[data-rail-badge="true"]')
    expect(badge?.textContent).toBe("3")
  })

  it("uses caller-supplied inboxAriaLabel as the regional name", () => {
    renderRail({
      slots: FULL_MEMORY_SLOTS,
      labels: {
        ...baseLabels,
        inboxAriaLabel: "Operator inbox",
      },
    })

    const region = screen.getByRole("region", { name: /operator inbox/i })
    expect(region.getAttribute("data-rail-section")).toBe("inbox")
  })

  it("clamps three-digit counts to '99+' to keep the row scannable", () => {
    renderRail({
      slots: {
        ...FULL_MEMORY_SLOTS,
        inbox: {
          label: "Pending invitations",
          count: 250,
          href: "/x",
          tone: "critical",
        },
      },
    })

    const link = screen.getByRole("link", { name: /pending invitations/i })
    expect(link.textContent).toMatch(/99\+/)
  })
})

// -- Pinned ------------------------------------------------------------

describe("WorkbenchRail pinned section", () => {
  it("renders heading + rows when slot present (expanded)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const section = document.querySelector('[data-rail-section="pinned"]')
    expect(section).not.toBeNull()
    expect(section?.getAttribute("data-rail-section-count")).toBe("2")

    expect(screen.getByText(/^Pinned$/i)).toBeDefined()
    expect(screen.getByRole("link", { name: /aisha khan/i })).toBeDefined()
    expect(
      screen.getByRole("link", { name: /q3 payroll review/i })
    ).toBeDefined()
  })

  it("hides entirely when slot is absent", () => {
    renderRail()

    expect(document.querySelector('[data-rail-section="pinned"]')).toBeNull()
  })

  it("hides entirely in collapsed mode (drops below 72px)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS, collapsed: true })

    expect(document.querySelector('[data-rail-section="pinned"]')).toBeNull()
  })

  it("uses caller-supplied heading when provided", () => {
    renderRail({
      slots: FULL_MEMORY_SLOTS,
      labels: { ...baseLabels, pinnedHeading: "épingles" },
    })

    expect(screen.getByText(/épingles/i)).toBeDefined()
  })

  it("activates the pin row matching the current pathname (exact match only)", () => {
    currentPathname = "/o/acme/dashboard/hrm/employees/emp-1"
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const aishaPin = screen.getByRole("link", { name: /aisha khan/i })
    expect(aishaPin.getAttribute("aria-current")).toBe("page")
    expect(aishaPin.getAttribute("data-active")).toBe("true")

    const payrollPin = screen.getByRole("link", { name: /q3 payroll review/i })
    expect(payrollPin.getAttribute("aria-current")).toBeNull()
  })

  it("does NOT activate pin rows on sibling sub-routes (exact match guard)", () => {
    currentPathname = "/o/acme/dashboard/hrm/employees/emp-1/edit"
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const aishaPin = screen.getByRole("link", { name: /aisha khan/i })
    expect(aishaPin.getAttribute("aria-current")).toBeNull()
  })
})

// -- Views -------------------------------------------------------------

describe("WorkbenchRail views section", () => {
  it("renders heading + rows when slot present (expanded)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const section = document.querySelector('[data-rail-section="views"]')
    expect(section).not.toBeNull()
    expect(section?.getAttribute("data-rail-section-count")).toBe("1")

    expect(screen.getByText(/^Views$/i)).toBeDefined()
    expect(
      screen.getByRole("link", { name: /active l3 engineers/i })
    ).toBeDefined()
  })

  it("hides entirely when slot is absent", () => {
    renderRail()

    expect(document.querySelector('[data-rail-section="views"]')).toBeNull()
  })

  it("hides entirely in collapsed mode (drops below 72px)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS, collapsed: true })

    expect(document.querySelector('[data-rail-section="views"]')).toBeNull()
  })

  it("uses caller-supplied heading when provided", () => {
    renderRail({
      slots: FULL_MEMORY_SLOTS,
      labels: { ...baseLabels, viewsHeading: "vues" },
    })

    expect(screen.getByText(/vues/i)).toBeDefined()
  })

  it("never marks a view row as aria-current — query-string URLs don't carry active state", () => {
    // Even when the pathname matches the view's path (sans query),
    // the row must NOT activate. View URLs almost always carry
    // filters; lighting them up on the bare index would be misleading.
    currentPathname = "/o/acme/dashboard/hrm/employees"
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const viewLink = screen.getByRole("link", {
      name: /active l3 engineers/i,
    })
    expect(viewLink.getAttribute("aria-current")).toBeNull()
    expect(viewLink.getAttribute("data-active")).toBeNull()
  })
})

// -- Recents -----------------------------------------------------------

describe("WorkbenchRail recents section", () => {
  it("renders heading + rows when slot present (expanded)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const section = document.querySelector('[data-rail-section="recents"]')
    expect(section).not.toBeNull()
    expect(section?.getAttribute("data-rail-section-count")).toBe("3")

    expect(screen.getByText(/^Recent$/i)).toBeDefined()
    expect(screen.getByRole("link", { name: /marcus tan/i })).toBeDefined()
    expect(
      screen.getByRole("link", { name: /leave policy 2026/i })
    ).toBeDefined()
    expect(screen.getByRole("link", { name: /members/i })).toBeDefined()
  })

  it("hides entirely when slot is absent", () => {
    renderRail()

    expect(document.querySelector('[data-rail-section="recents"]')).toBeNull()
  })

  it("hides entirely in collapsed mode (drops below 72px)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS, collapsed: true })

    expect(document.querySelector('[data-rail-section="recents"]')).toBeNull()
  })

  it("renders deterministic relative time via mocked formatter", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const marcusLink = screen.getByRole("link", { name: /marcus tan/i })
    const marcusTime = marcusLink.querySelector("time")
    expect(marcusTime?.getAttribute("datetime")).toBe(
      "2026-05-12T11:55:00.000Z"
    )
    expect(marcusTime?.textContent).toBe("5m ago")

    const policyLink = screen.getByRole("link", { name: /leave policy 2026/i })
    expect(policyLink.querySelector("time")?.textContent).toBe("1h ago")

    const membersLink = screen.getByRole("link", { name: /members/i })
    expect(membersLink.querySelector("time")?.textContent).toBe("1d ago")
  })

  it("activates the recent row matching the current pathname (exact match only)", () => {
    currentPathname = "/o/acme/dashboard/hrm/employees/emp-2"
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const marcusLink = screen.getByRole("link", { name: /marcus tan/i })
    expect(marcusLink.getAttribute("aria-current")).toBe("page")

    const policyLink = screen.getByRole("link", { name: /leave policy 2026/i })
    expect(policyLink.getAttribute("aria-current")).toBeNull()
  })

  it("renders a bullet glyph for icon-less recents (e.g. list-level surfaces)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const membersLink = screen.getByRole("link", { name: /members/i })
    const bullet = membersLink.querySelector('[data-rail-recent-bullet="true"]')
    expect(bullet).not.toBeNull()
  })

  it("uses caller-supplied heading when provided", () => {
    renderRail({
      slots: FULL_MEMORY_SLOTS,
      labels: { ...baseLabels, recentsHeading: "récents" },
    })

    expect(screen.getByText(/récents/i)).toBeDefined()
  })
})

// -- Composition (workbench-rail.tsx) ----------------------------------

describe("WorkbenchRail composition (Working Memory Rail)", () => {
  it("renders inbox above nav, then memory sections in order: views → pinned → recents", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    const allSections = Array.from(
      document.querySelectorAll("[data-rail-section]")
    ).map((node) => node.getAttribute("data-rail-section"))

    expect(allSections).toStrictEqual(["inbox", "views", "pinned", "recents"])
  })

  it("renders the memory divider hairline when at least one memory section is present", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS })

    expect(
      document.querySelector('[data-rail-memory-divider="true"]')
    ).not.toBeNull()
  })

  it("does NOT render the memory divider when no memory sections are present", () => {
    renderRail()

    expect(
      document.querySelector('[data-rail-memory-divider="true"]')
    ).toBeNull()
  })

  it("does NOT render the memory divider in collapsed mode (chrome stays calm)", () => {
    renderRail({ slots: FULL_MEMORY_SLOTS, collapsed: true })

    expect(
      document.querySelector('[data-rail-memory-divider="true"]')
    ).toBeNull()
  })

  it("inbox-only: renders inbox + nav, no memory sections, no divider", () => {
    renderRail({
      slots: {
        ...FULL_MEMORY_SLOTS,
        pinned: undefined,
        views: undefined,
        recents: undefined,
      },
    })

    expect(document.querySelector('[data-rail-section="inbox"]')).not.toBeNull()
    expect(document.querySelector('[data-rail-section="pinned"]')).toBeNull()
    expect(document.querySelector('[data-rail-section="views"]')).toBeNull()
    expect(document.querySelector('[data-rail-section="recents"]')).toBeNull()
    expect(
      document.querySelector('[data-rail-memory-divider="true"]')
    ).toBeNull()
  })
})

// -- Phase 3c labels schema additions ----------------------------------

describe("workbench-rail.schema (Phase 3c labels)", () => {
  it("accepts the four new optional section-affordance labels", () => {
    const parsed = parseWorkbenchRailLabels({
      ariaLabel: "Rail",
      collapseLabel: "Collapse",
      expandLabel: "Expand",
      inboxAriaLabel: "Operator inbox",
      pinnedHeading: "Épingles",
      viewsHeading: "Vues",
      recentsHeading: "Récents",
    })
    expect(parsed.inboxAriaLabel).toBe("Operator inbox")
    expect(parsed.pinnedHeading).toBe("Épingles")
    expect(parsed.viewsHeading).toBe("Vues")
    expect(parsed.recentsHeading).toBe("Récents")
  })

  it("keeps strict-key guard intact (rejects unknown extra label keys)", () => {
    expect(() =>
      parseWorkbenchRailLabels({
        ariaLabel: "Rail",
        collapseLabel: "Collapse",
        expandLabel: "Expand",
        decorativeBanner: "noise",
      })
    ).toThrow()
  })

  it("rejects empty string overrides — empty labels are a regression, not a no-op", () => {
    expect(() =>
      parseWorkbenchRailLabels({
        ariaLabel: "Rail",
        collapseLabel: "Collapse",
        expandLabel: "Expand",
        pinnedHeading: "",
      })
    ).toThrow()
  })
})
