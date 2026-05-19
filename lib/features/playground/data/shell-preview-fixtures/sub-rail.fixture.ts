import type { AppShellPrimaryLeftRailConfig } from "#app-shell"

import { SHELL_PREVIEW_HREF } from "../../schemas/playground-paths.shared"

export const SHELL_PREVIEW_SUB_RAIL: AppShellPrimaryLeftRailConfig = {
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
