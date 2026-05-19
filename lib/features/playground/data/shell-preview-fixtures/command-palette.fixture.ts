import { Sparkles } from "lucide-react"

import type {
  AppShellCommandPaletteProps,
  AppShellCommandPaletteSection,
} from "#app-shell/client"

import { SHELL_PREVIEW_HREF } from "../../schemas/playground-paths.shared"

export const SHELL_PREVIEW_COMMAND_SECTIONS: AppShellCommandPaletteSection[] = [
  {
    heading: "Navigation",
    items: [
      {
        id: "cmd-dashboard",
        label: "Dashboard",
        description: "Primary rail — mock item",
        href: SHELL_PREVIEW_HREF,
        keywords: ["home", "overview"],
        shortcut: "↵",
      },
      {
        id: "cmd-contacts",
        label: "Contacts",
        description: "People & organizations",
        href: SHELL_PREVIEW_HREF,
        keywords: ["people", "crm", "customers"],
      },
      {
        id: "cmd-hrm",
        label: "HRM",
        description: "Human resources",
        href: SHELL_PREVIEW_HREF,
        keywords: ["hr", "employees", "payroll"],
      },
      {
        id: "cmd-lynx-insight",
        label: "Lynx · machine insight",
        description: "Truth retrieval — preview stays on this page",
        href: SHELL_PREVIEW_HREF,
        icon: Sparkles,
        keywords: [
          "lynx",
          "machine",
          "insight",
          "truth",
          "retrieval",
          "sparkles",
        ],
      },
    ],
  },
  {
    heading: "Shell preview",
    items: [
      {
        id: "cmd-reload-preview",
        label: "Reload shell preview",
        description: "Stays on this dev URL",
        href: SHELL_PREVIEW_HREF,
        keywords: ["refresh", "dev"],
      },
    ],
  },
]

export const SHELL_PREVIEW_COMMAND_PALETTE_PROPS: AppShellCommandPaletteProps =
  {
    placeholder: "Search navigation, pages, and actions…",
    dialogTitle: "Command palette",
    dialogDescription:
      "Preview of the components2 cmdk dialog — all navigation targets stay on this page.",
    sections: SHELL_PREVIEW_COMMAND_SECTIONS,
  }
