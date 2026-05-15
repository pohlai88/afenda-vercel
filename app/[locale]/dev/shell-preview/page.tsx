import { redirect } from "next/navigation"
import type { Route } from "next"
import { FilePlus } from "lucide-react"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { AppShell, AppShellSurface, AppSubLayout } from "#app-shell"
import type { AppShellRailConfig } from "#app-shell"
import {
  AppShellBrandDisc,
  AppShellAppsDisc,
} from "#components2/app-shell/client"
import { AppShellRailFooter } from "#components2/app-shell/rail-footer.client"

import {
  ShellPreviewCommandPalette,
  ShellPreviewCommandSearch,
} from "./shell-preview-command-search.client"
import {
  ShellPreviewCrudSapActionBar,
  ShellPreviewSapBtn,
} from "./shell-preview-crud-sap-action-bar.client"
import { ShellPreviewOperationalScope } from "./shell-preview-operational-scope.client"
import { ShellPreviewPolicyDisc } from "./shell-preview-policy-disc.client"
import { ShellPreviewUtilityBarRight } from "./shell-preview-utility-bar-right.client"
const PREVIEW_HREF = "/dev/shell-preview" as Route

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
            hover: "Expand on hover",
            hoverHelp: "Show only icons; expands while hovering.",
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
        right: (
          <>
            <ShellPreviewCommandSearch />
            <ShellPreviewUtilityBarRight />
          </>
        ),
      }}
    >
      <AppSubLayout rail={SUB_RAIL} command={<ShellPreviewCommandPalette />}>
        <AppShellSurface
          title="Shell Preview"
          subtitle="components2/app-shell: primary rail (AppShell) + secondary in-flow rail (AppSubLayout) + operational scope rail mock in the utility bar. Mock labels and badges are hardcoded; all links stay on this URL."
          breadcrumbs={[
            { label: "Dev" },
            { label: "Shell Preview" },
            { label: "HRM" },
            { label: "Employees" },
          ]}
          headerActions={<ShellPreviewCrudSapActionBar />}
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
    <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
      <AppShellBrandDisc
        href={PREVIEW_HREF}
        ariaLabel="Afenda home (preview)"
        tooltip="Organization home — reloads this preview page"
      />
      <AppShellAppsDisc
        ariaLabel="Apps (preview)"
        tooltip="App launcher — CSS preview only"
      />
      <ShellPreviewPolicyDisc />
      <div aria-hidden className="h-4 w-px shrink-0 bg-border/40" />
      <ShellPreviewOperationalScope />
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
            <ShellPreviewSapBtn label="Create">
              <FilePlus strokeWidth={2} />
            </ShellPreviewSapBtn>
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
            <code>AppSubLayout</code> with{" "}
            <code>rail=&#123;SUB_RAIL&#125;</code>: floating HRM text nav when
            the primary sidebar is icon-only (
            <code>useSidebar().open === false</code>). Hover the content pane to
            reveal it.{" "}
            <code>
              command=&#123;&lt;ShellPreviewCommandPalette /&gt;&#125;
            </code>{" "}
            mounts the cmdk dialog with the same store as the center search
            trigger.
          </li>
          <li>
            Mock nav, badges, and recents are cosmetic; every <code>href</code>{" "}
            points back to this page.
          </li>
          <li>
            <strong className="text-foreground">
              Utility bar — tenant vs scope
            </strong>{" "}
            — The <strong>building + name</strong> chip is the active{" "}
            <em>organization</em> (workspace tenant), same role as{" "}
            <code>WorkbenchOrgCompanySwitch</code> on real ERP routes. The{" "}
            <strong>operational scope</strong> rail (project, team, …) is{" "}
            <em>inside</em> that tenant — ADR-0019 does not model organization
            as a scope dimension, so it will not appear as a fifth row in{" "}
            <strong>Configure</strong>.
          </li>
          <li>
            <strong className="text-foreground">
              Utility bar — operational scope
            </strong>{" "}
            — <code>OperationalScopeRail</code> (mock context via{" "}
            <code>ShellPreviewOperationalScope</code>): project + team pills,{" "}
            <strong>Add scope</strong> ghost, and org-admin{" "}
            <strong>Configure</strong> sheet. Server Actions are not connected
            to a real org session in this preview.
          </li>
          <li>
            <strong className="text-foreground">
              Utility bar — right rail
            </strong>{" "}
            — <code>AppShellUtilityBarRight</code> renders items from the
            persisted Zustand store (<code>useUtilityBarStore</code>). Icons are
            drag-to-reorder; order and visibility are saved to{" "}
            <code>localStorage</code>. The <strong>Marketplace</strong> Store
            icon opens <code>AppShellUtilityDropdown</code> with a titled
            header, dev-style row hovers, grouped actions, and a footnote
            footer. <strong>Customise icon bar</strong> opens a right{" "}
            <code>Sheet</code> with the drag/toggle list;{" "}
            <strong>Request utility</strong> opens a stub <code>Dialog</code>.
            The avatar opens <code>AppShellAccountDropdown</code> (personal IAM
            links + coming-soon placeholders + preview sign-out no-op).
          </li>
          <li>
            <strong className="text-foreground">
              Surface chrome — CRUD-SAP mock
            </strong>{" "}
            — <code>ShellPreviewCrudSapActionBar</code>: edge-only separators,
            HTML5 drag-and-drop reorder (same affordance as the right rail),
            persisted under{" "}
            <code>afenda-dev-shell-preview-crud-sap-order-v1</code>.
          </li>
        </ul>
      </section>
    </div>
  )
}
