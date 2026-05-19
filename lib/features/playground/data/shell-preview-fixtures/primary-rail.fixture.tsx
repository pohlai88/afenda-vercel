import type { AppShellPrimaryLeftRailConfig } from "#app-shell"
import { AppShellPrimaryLeftRailFooter } from "#app-shell/client"

import { SHELL_PREVIEW_HREF } from "../../schemas/playground-paths.shared"

export function buildShellPreviewPrimaryRail(): AppShellPrimaryLeftRailConfig {
  return {
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
}
