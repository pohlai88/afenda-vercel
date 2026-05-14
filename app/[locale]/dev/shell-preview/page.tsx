import { redirect } from "next/navigation"
import {
  BellIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  UserCircleIcon,
} from "lucide-react"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { AppShell, AppShellSurface, AppSubLayout } from "#app-shell"
import type { AppShellRailConfig } from "#app-shell"
import { AppShellRailFooter } from "#components2/app-shell/rail-footer.client"
import { Button } from "#components2/ui/button"

/** Every mock link stays on this page — preview is for `components2` app-shell chrome only. */
const PREVIEW_HREF = "/dev/shell-preview"

// ---------------------------------------------------------------------------
// Sub-layout rail — secondary in-flow aside (mirrors an HRM workbench)
// ---------------------------------------------------------------------------

const SUB_RAIL: AppShellRailConfig = {
  storageKey: "dev-shell-preview-sub-rail",
  labels: {
    ariaLabel: "HRM navigation",
    collapseLabel: "Collapse",
    expandLabel: "Expand",
  },
  slots: {
    nav: [
      {
        id: "hrm-primary",
        items: [
          {
            id: "sub-overview",
            label: "Overview",
            icon: "layout-dashboard",
            href: PREVIEW_HREF,
            match: "exact",
          },
          {
            id: "sub-employees",
            label: "Employees",
            icon: "users",
            href: PREVIEW_HREF,
            active: true,
            items: [
              {
                id: "sub-employees-all",
                label: "All employees",
                href: PREVIEW_HREF,
              },
              {
                id: "sub-employees-active",
                label: "Active",
                href: PREVIEW_HREF,
              },
              {
                id: "sub-employees-offboarding",
                label: "Offboarding",
                href: PREVIEW_HREF,
              },
            ],
          },
          {
            id: "sub-payroll",
            label: "Payroll",
            icon: "file-text",
            href: PREVIEW_HREF,
          },
          {
            id: "sub-attendance",
            label: "Attendance",
            icon: "clock",
            href: PREVIEW_HREF,
          },
          {
            id: "sub-recruitment",
            label: "Recruitment",
            icon: "briefcase",
            href: PREVIEW_HREF,
          },
        ],
      },
      {
        id: "hrm-compliance",
        label: "Compliance",
        items: [
          {
            id: "sub-compliance",
            label: "Compliance",
            icon: "shield-check",
            href: PREVIEW_HREF,
          },
          {
            id: "sub-audit",
            label: "Audit log",
            icon: "list",
            href: PREVIEW_HREF,
          },
        ],
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Dev-only guard
// ---------------------------------------------------------------------------

export default async function ShellPreviewPage({
  params,
}: PageProps<"/[locale]/dev/shell-preview">) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/")
  }

  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  const rail: AppShellRailConfig = {
    storageKey: "dev-shell-preview-rail",
    labels: {
      ariaLabel: "Main navigation",
      collapseLabel: "Collapse sidebar",
      expandLabel: "Expand sidebar",
      navSearchPlaceholder: "Search...",
      navSearchAriaLabel: "Search navigation",
      navSearchCollapsedTriggerAriaLabel: "Open search",
      navSearchNoMatches: "No results",
      viewsHeading: "Saved views",
      recentsHeading: "Recent",
    },
    slots: {
      nav: [
        {
          id: "main",
          items: [
            {
              id: "dashboard",
              label: "Dashboard",
              icon: "layout-dashboard",
              href: PREVIEW_HREF,
              match: "exact",
            },
            {
              id: "contacts",
              label: "Contacts",
              icon: "users",
              href: PREVIEW_HREF,
              active: false,
              badge: { count: 3, tone: "default" },
            },
            {
              id: "projects",
              label: "Projects",
              icon: "briefcase",
              href: PREVIEW_HREF,
              active: false,
            },
          ],
        },
        {
          id: "management",
          label: "Management",
          items: [
            {
              id: "hrm",
              label: "HRM",
              icon: "user-round",
              href: PREVIEW_HREF,
              active: false,
              badge: { count: 12, tone: "attention" },
              items: [
                {
                  id: "hrm-employees",
                  label: "Employees",
                  href: PREVIEW_HREF,
                  active: false,
                },
                {
                  id: "hrm-payroll",
                  label: "Payroll",
                  href: PREVIEW_HREF,
                  active: false,
                },
                {
                  id: "hrm-attendance",
                  label: "Attendance",
                  href: PREVIEW_HREF,
                  active: false,
                },
              ],
            },
            {
              id: "reports",
              label: "Reports",
              icon: "file-text",
              href: PREVIEW_HREF,
              active: false,
            },
            {
              id: "settings",
              label: "Settings",
              icon: "settings",
              href: PREVIEW_HREF,
              active: false,
            },
          ],
        },
      ],
      recents: [
        {
          id: "rec-1",
          label: "Alice Nguyen",
          href: PREVIEW_HREF,
          icon: "user-round",
          resourceType: "employee",
          resourceId: "emp-alice",
          occurredAt: "2026-05-14T02:53:00.000Z",
        },
        {
          id: "rec-2",
          label: "Payroll — March 2026",
          href: PREVIEW_HREF,
          icon: "file-text",
          resourceType: "payroll_period",
          occurredAt: "2026-05-14T02:28:00.000Z",
        },
        {
          id: "rec-3",
          label: "Compliance Report",
          href: PREVIEW_HREF,
          icon: "shield-check",
          resourceType: "report",
          occurredAt: "2026-05-14T00:58:00.000Z",
        },
      ],
      footer: (
        <AppShellRailFooter
          labels={{
            sidebarControl: "Sidebar",
            expanded: "Expanded mode",
            expandedHelp: "Always show the full navigation rail.",
            collapsed: "Collapsed",
            collapsedHelp: "Show only icons in the navigation rail.",
          }}
        />
      ),
    },
  }

  return (
    <AppShell
      envelope={{ surface: "dashboard", locale }}
      rail={rail}
      utilityBar={{
        left: <UtilityBarLeft />,
        right: <UtilityBarRight />,
      }}
    >
      <AppSubLayout rail={SUB_RAIL}>
        <AppShellSurface
          title="Shell Preview"
          subtitle="components2/app-shell: primary rail (AppShell) + secondary in-flow rail (AppSubLayout). Mock labels and badges are hardcoded; all links stay on this URL."
          breadcrumbs={[
            { label: "Dev" },
            { label: "Shell Preview" },
            { label: "HRM" },
            { label: "Employees" },
          ]}
          headerActions={
            <Button size="sm" className="gap-1.5">
              <PlusIcon className="size-3.5" aria-hidden />
              New item
            </Button>
          }
        >
          <PreviewContent />
        </AppShellSurface>
      </AppSubLayout>
    </AppShell>
  )
}

// ---------------------------------------------------------------------------
// Utility bar slots — minimal mock
// ---------------------------------------------------------------------------

function UtilityBarLeft() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
        A
      </div>
      <div className="flex items-center gap-1 text-sm">
        <span className="font-medium text-foreground">Acme Corp</span>
        <ChevronRightIcon
          className="size-3.5 text-muted-foreground"
          aria-hidden
        />
        <span className="text-muted-foreground">Dashboard</span>
      </div>
    </div>
  )
}

function UtilityBarRight() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" aria-label="Search">
        <SearchIcon className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Notifications"
        className="relative"
      >
        <BellIcon className="size-4" aria-hidden />
        <span
          aria-hidden
          className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive"
        />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Account">
        <UserCircleIcon className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preview body — stat cards + sample table (hardcoded filler)
// ---------------------------------------------------------------------------

const STATS = [
  {
    label: "Total employees",
    value: "248",
    delta: "+3 this week",
    tone: "positive",
  },
  {
    label: "Open positions",
    value: "12",
    delta: "4 urgent",
    tone: "attention",
  },
  {
    label: "Payroll this month",
    value: "$1.2M",
    delta: "On track",
    tone: "default",
  },
  {
    label: "Compliance items",
    value: "3",
    delta: "2 overdue",
    tone: "critical",
  },
] as const

const SAMPLE_ROWS = [
  {
    id: "1",
    name: "Alice Nguyen",
    role: "Software Engineer",
    status: "Active",
    dept: "Engineering",
  },
  {
    id: "2",
    name: "Bob Carter",
    role: "Product Manager",
    status: "Active",
    dept: "Product",
  },
  {
    id: "3",
    name: "Carol Kim",
    role: "Designer",
    status: "On leave",
    dept: "Design",
  },
  {
    id: "4",
    name: "Dan Smith",
    role: "HR Specialist",
    status: "Active",
    dept: "People",
  },
  {
    id: "5",
    name: "Eva Torres",
    role: "Finance Lead",
    status: "Active",
    dept: "Finance",
  },
] as const

const STATUS_CLASS: Record<string, string> = {
  Active: "bg-success/15 text-success",
  "On leave": "bg-warning/20 text-warning-foreground",
}

const DELTA_TONE_CLASS: Record<string, string> = {
  positive: "text-success",
  attention: "text-warning-foreground",
  default: "text-muted-foreground",
  critical: "text-destructive",
}

function PreviewContent() {
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Statistics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-xs"
            >
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </span>
              <span className="text-2xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </span>
              <span
                className={`text-xs font-medium ${DELTA_TONE_CLASS[stat.tone]}`}
              >
                {stat.delta}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Employee list">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">Employees</h2>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <PlusIcon className="size-3.5" aria-hidden />
              Add employee
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {["Name", "Role", "Department", "Status"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {SAMPLE_ROWS.map((row) => (
                <tr
                  key={row.id}
                  className="group/row transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.role}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.dept}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[row.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-label="Dev notes"
        className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-xs text-muted-foreground"
      >
        <p className="font-medium text-foreground">Dev preview notes</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          <li>
            <strong className="text-foreground">Primary rail</strong> —{" "}
            <code>AppShell</code> with <code>mode=&quot;primary&quot;</code>:{" "}
            <code>PrimaryNavItem</code> / <code>SidebarMenuButton</code> —
            collapse and tooltips via <code>SidebarProvider</code>. Persist key:{" "}
            <code>dev-shell-preview-rail</code>.
          </li>
          <li>
            <strong className="text-foreground">Secondary rail</strong> —{" "}
            <code>AppSubLayout</code>: absolute overlay on the left edge of the
            content area. Hover the content pane to reveal it. Pure text
            hierarchy — no icons, no badges, no toggle. Section headings at 8
            px, items at 9 px, child items at 8 px.
          </li>
          <li>
            Mock nav, badges, and recents are cosmetic; every <code>href</code>{" "}
            points back to this page.
          </li>
        </ul>
      </section>
    </div>
  )
}
