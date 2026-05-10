"use client"

import { Keyboard } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#components/ui/popover"
import { Separator } from "#components/ui/separator"
import { cn } from "#lib/utils"

import { useModKeySymbol } from "./nexus-mod-key-symbol.store"
import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"
import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"

type ShortcutRowProps = {
  label: string
  keys: string[]
}

function ShortcutRow({ label, keys }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {keys.map((key, ki) => (
          <kbd
            key={`${label}-${ki}-${key}`}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/60 bg-muted/50 px-1 font-mono text-[10px] text-foreground/80"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}

type ShortcutSection = {
  heading: string
  rows: ShortcutRowProps[]
}

/** Keyboard shortcut reference popover (L1 utility bar). */
export function NexusUtilityShortcuts() {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const modSymbol = useModKeySymbol()

  const shortcutSections = useMemo<ShortcutSection[]>(
    () => [
      {
        heading: "Navigation",
        rows: [
          { label: "Open command palette", keys: [modSymbol, "K"] },
          { label: "Go to Nexus", keys: ["G", "N"] },
          { label: "Go to iThink", keys: ["G", "I"] },
          { label: "Go to Lynx", keys: ["G", "L"] },
          { label: "Go to Contacts", keys: ["G", "C"] },
          { label: "Go to Knowledge", keys: ["G", "K"] },
          { label: "Open Lynx summon", keys: ["?"] },
        ],
      },
      {
        heading: "Actions",
        rows: [
          { label: "Quick create", keys: ["C"] },
          { label: "Close / dismiss", keys: ["Esc"] },
        ],
      },
      {
        heading: "Interface",
        rows: [
          { label: "Toggle dark mode", keys: [modSymbol, "⇧", "L"] },
          { label: "Focus utility bar", keys: [modSymbol, "⇧", "U"] },
        ],
      },
    ],
    [modSymbol]
  )

  return (
    <Popover>
      <NexusUtilityTriggerTooltip tooltip={t("shortcutsTooltip")} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("shortcuts")}
            className={cn(NEXUS_UTILITY_ROUND_CONTROL_CLASS)}
          >
            <Keyboard
              className="size-[15px] shrink-0"
              aria-hidden
              strokeWidth={2}
            />
          </button>
        </PopoverTrigger>
      </NexusUtilityTriggerTooltip>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="w-64 bg-background/92 p-0 backdrop-blur-2xl"
      >
        <div className="border-b border-border/50 px-4 py-3">
          <p className="text-xs font-medium text-foreground">
            {t("shortcutsTitle")}
          </p>
        </div>

        <div className="flex flex-col gap-0 py-2">
          {shortcutSections.map((section, si) => (
            <div key={section.heading}>
              {si > 0 && <Separator className="my-2 opacity-50" />}
              <div className="px-4 pb-1 pt-2">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {section.heading}
                </p>
                <div className="flex flex-col gap-2">
                  {section.rows.map((row) => (
                    <ShortcutRow key={row.label} {...row} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
