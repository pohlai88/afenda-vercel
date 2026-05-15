"use client"

import type { Route } from "next"
import { Sparkles } from "lucide-react"

import {
  AppShellCommandPalette,
  AppShellUtilityBarCommandSearchTrigger,
  type AppShellCommandPaletteProps,
  type AppShellCommandPaletteSection,
} from "#components2/app-shell/client"

/** Locale-internal href — shell-preview stays on this dev route for all mock actions. */
const PREVIEW_HREF = "/dev/shell-preview" as Route

const SHELL_PREVIEW_COMMAND_SECTIONS: AppShellCommandPaletteSection[] = [
  {
    heading: "Navigation",
    items: [
      {
        id: "cmd-dashboard",
        label: "Dashboard",
        description: "Primary rail — mock item",
        href: PREVIEW_HREF,
        keywords: ["home", "overview"],
        shortcut: "↵",
      },
      {
        id: "cmd-contacts",
        label: "Contacts",
        description: "People & organizations",
        href: PREVIEW_HREF,
        keywords: ["people", "crm", "customers"],
      },
      {
        id: "cmd-hrm",
        label: "HRM",
        description: "Human resources",
        href: PREVIEW_HREF,
        keywords: ["hr", "employees", "payroll"],
      },
      {
        id: "cmd-lynx-insight",
        label: "Lynx · machine insight",
        description: "Truth retrieval — preview stays on this page",
        href: PREVIEW_HREF,
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
        href: PREVIEW_HREF,
        keywords: ["refresh", "dev"],
      },
    ],
  },
]

const PALETTE_PROPS: AppShellCommandPaletteProps = {
  placeholder: "Search navigation, pages, and actions…",
  dialogTitle: "Command palette",
  dialogDescription:
    "Preview of the components2 cmdk dialog — all navigation targets stay on this page.",
  sections: SHELL_PREVIEW_COMMAND_SECTIONS,
}

/**
 * L1 utility-bar search trigger only — pairs with {@link ShellPreviewCommandPalette}
 * passed to `AppSubLayout` `command` so the dialog mounts with sub-layout chrome.
 */
const SEP = <div aria-hidden className="h-4 w-px shrink-0 bg-border/40" />

export function ShellPreviewCommandSearch() {
  return (
    <>
      {SEP}
      <AppShellUtilityBarCommandSearchTrigger
        placeholder={PALETTE_PROPS.placeholder}
        triggerAriaLabel="Open command palette"
      />
      {SEP}
    </>
  )
}

/** Command dialog + ⌘K — wire as `AppSubLayout command={…}` on the shell preview page. */
export function ShellPreviewCommandPalette() {
  return <AppShellCommandPalette {...PALETTE_PROPS} />
}
