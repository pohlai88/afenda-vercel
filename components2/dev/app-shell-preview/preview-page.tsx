import { redirect } from "next/navigation"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { AppShell, AppSubLayout, AppShellSurface } from "#app-shell"
import type { AppShellPrimaryLeftRailConfig } from "#app-shell"
import {
  AppShellBrandDisc,
  AppShellAppsDisc,
  AppShellPrimaryLeftRailFooter,
  CrudSapActionBar,
} from "#app-shell/client"

import { SHELL_PREVIEW_HREF } from "../fixtures/preview-href.shared"
import {
  AppShellPreviewCommandPalette,
  AppShellPreviewCommandSearch,
} from "./command-search.client"
import { AppShellPreviewOperationalScope } from "./operational-scope.client"
import { AppShellPreviewPolicyDisc } from "./policy-disc.client"
import { AppShellPreviewContent } from "./preview-content"
import { AppShellPreviewUtilityBarRight } from "./utility-bar-right.client"

const SUB_RAIL: AppShellPrimaryLeftRailConfig = {
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
            href: SHELL_PREVIEW_HREF,
            active: true,
            items: [
              {
                id: "sub-employees-all",
                label: "All employees",
                href: SHELL_PREVIEW_HREF,
              },
              {
                id: "sub-employees-active",
                label: "Active",
                href: SHELL_PREVIEW_HREF,
              },
              {
                id: "sub-employees-offboarding",
                label: "Offboarding",
                href: SHELL_PREVIEW_HREF,
              },
            ],
          },
          {
            id: "sub-payroll",
            label: "Payroll",
            icon: "file-text",
            href: SHELL_PREVIEW_HREF,
          },
          {
            id: "sub-attendance",
            label: "Attendance",
            icon: "clock",
            href: SHELL_PREVIEW_HREF,
          },
          {
            id: "sub-recruitment",
            label: "Recruitment",
            icon: "briefcase",
            href: SHELL_PREVIEW_HREF,
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
            href: SHELL_PREVIEW_HREF,
          },
          {
            id: "sub-audit",
            label: "Audit log",
            icon: "list",
            href: SHELL_PREVIEW_HREF,
          },
        ],
      },
    ],
  },
}

export default async function AppShellPreviewPage({
  params,
}: PageProps<"/[locale]/dev/shell-preview">) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/")
  }

  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  const rail: AppShellPrimaryLeftRailConfig = {
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
              href: SHELL_PREVIEW_HREF,
              match: "exact",
            },
            {
              id: "contacts",
              label: "Contacts",
              icon: "users",
              href: SHELL_PREVIEW_HREF,
              active: false,
              badge: { count: 3, tone: "default" },
            },
            {
              id: "projects",
              label: "Projects",
              icon: "briefcase",
              href: SHELL_PREVIEW_HREF,
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
              href: SHELL_PREVIEW_HREF,
              active: false,
              badge: { count: 12, tone: "attention" },
              items: [
                {
                  id: "hrm-employees",
                  label: "Employees",
                  href: SHELL_PREVIEW_HREF,
                  active: false,
                },
                {
                  id: "hrm-payroll",
                  label: "Payroll",
                  href: SHELL_PREVIEW_HREF,
                  active: false,
                },
                {
                  id: "hrm-attendance",
                  label: "Attendance",
                  href: SHELL_PREVIEW_HREF,
                  active: false,
                },
              ],
            },
            {
              id: "reports",
              label: "Reports",
              icon: "file-text",
              href: SHELL_PREVIEW_HREF,
              active: false,
            },
            {
              id: "settings",
              label: "Settings",
              icon: "settings",
              href: SHELL_PREVIEW_HREF,
              active: false,
            },
          ],
        },
      ],
      recents: [
        {
          id: "rec-1",
          label: "Alice Nguyen",
          href: SHELL_PREVIEW_HREF,
          icon: "user-round",
          resourceType: "employee",
          resourceId: "emp-alice",
          occurredAt: "2026-05-14T02:53:00.000Z",
        },
        {
          id: "rec-2",
          label: "Payroll — March 2026",
          href: SHELL_PREVIEW_HREF,
          icon: "file-text",
          resourceType: "payroll_period",
          occurredAt: "2026-05-14T02:28:00.000Z",
        },
        {
          id: "rec-3",
          label: "Compliance Report",
          href: SHELL_PREVIEW_HREF,
          icon: "shield-check",
          resourceType: "report",
          occurredAt: "2026-05-14T00:58:00.000Z",
        },
      ],
      footer: (
        <AppShellPrimaryLeftRailFooter
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
            <AppShellPreviewCommandSearch />
            <AppShellPreviewUtilityBarRight />
          </>
        ),
      }}
    >
      <AppSubLayout rail={SUB_RAIL} command={<AppShellPreviewCommandPalette />}>
        <AppShellSurface
          title="Shell Preview"
          subtitle="components2/app-shell: primary rail (AppShell) + secondary in-flow rail (AppSubLayout) + operational scope rail mock in the utility bar. Mock labels and badges are hardcoded; all links stay on this URL."
          breadcrumbs={[
            { label: "Dev" },
            { label: "Shell Preview" },
            { label: "HRM" },
            { label: "Employees" },
          ]}
          headerActions={<CrudSapActionBar />}
        >
          <AppShellPreviewContent />
        </AppShellSurface>
      </AppSubLayout>
    </AppShell>
  )
}

function UtilityBarLeft() {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
      <AppShellBrandDisc
        href={SHELL_PREVIEW_HREF}
        ariaLabel="Afenda home (preview)"
        tooltip="Organization home — reloads this preview page"
      />
      <AppShellAppsDisc
        ariaLabel="Apps (preview)"
        tooltip="App launcher — CSS preview only"
      />
      <AppShellPreviewPolicyDisc />
      <div aria-hidden className="h-4 w-px shrink-0 bg-border/40" />
      <AppShellPreviewOperationalScope />
    </div>
  )
}
