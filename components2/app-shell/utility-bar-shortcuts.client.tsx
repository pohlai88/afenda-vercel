"use client"

import { cn } from "#lib/utils"

import { Kbd, KbdGroup } from "../ui/kbd"
import { AppShellShortcutsIcon } from "./utility-bar.client"
import { AppShellUtilityPanel } from "./utility-bar-panel.client"

// ---------------------------------------------------------------------------
// Shortcut data
// ---------------------------------------------------------------------------

type ShortcutRow = {
  label: string
  mac: string[]
  win: string[]
  comingSoon?: boolean
}

type ShortcutGroup = {
  title: string
  rows: ShortcutRow[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    rows: [
      { label: "Command palette", mac: ["⌘", "K"], win: ["Ctrl", "K"] },
      { label: "Toggle nav rail", mac: ["⌘", "B"], win: ["Ctrl", "B"] },
    ],
  },
  {
    title: "Actions",
    rows: [
      { label: "Save", mac: ["⌘", "S"], win: ["Ctrl", "S"] },
      { label: "Close / cancel", mac: ["Esc"], win: ["Esc"] },
    ],
  },
  {
    title: "ERP modules",
    rows: [
      { label: "Module shortcuts", mac: ["—"], win: ["—"], comingSoon: true },
      { label: "Field navigation", mac: ["—"], win: ["—"], comingSoon: true },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Right-rail shortcuts reference panel — Popover anchored below the trigger. */
export function UtilityBarShortcutsPanel() {
  return (
    <AppShellUtilityPanel
      trigger={
        <AppShellShortcutsIcon
          ariaLabel="Keyboard shortcuts"
          tooltip="Keyboard shortcuts"
        />
      }
      title="Keyboard shortcuts"
      description="Available across the ERP shell and modules."
      widthClass="w-96"
    >
      <div className="space-y-5 px-4 py-4">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.title}
            </p>
            <div className="divide-y divide-border/50">
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center justify-between py-2",
                    row.comingSoon && "opacity-40"
                  )}
                >
                  <span className="text-[11px] text-foreground">
                    {row.label}
                    {row.comingSoon && (
                      <span className="ml-1.5 text-[9px] text-muted-foreground">
                        (coming soon)
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <KbdGroup>
                      {row.mac.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </KbdGroup>

                    {row.win.join("") !== row.mac.join("") && (
                      <>
                        <span className="text-[9px] text-muted-foreground">
                          /
                        </span>
                        <KbdGroup>
                          {row.win.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </KbdGroup>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShellUtilityPanel>
  )
}
