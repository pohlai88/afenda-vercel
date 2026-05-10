"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { cn } from "#lib/utils"

import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"
import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"

/** Compact appearance control for the right rail. */
export function NexusUtilityThemeMenu() {
  const { setTheme } = useTheme()
  const t = useTranslations("Dashboard.shell.utilityBar.theme")

  return (
    <DropdownMenu>
      <NexusUtilityTriggerTooltip tooltip={t("tooltip")}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(NEXUS_UTILITY_ROUND_CONTROL_CLASS, "relative")}
          >
            <Sun
              className="size-[15px] shrink-0 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
              aria-hidden
              strokeWidth={2}
            />
            <Moon
              className="absolute size-[15px] shrink-0 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
              aria-hidden
              strokeWidth={2}
            />
          </button>
        </DropdownMenuTrigger>
      </NexusUtilityTriggerTooltip>

      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 size-3.5" aria-hidden strokeWidth={2} />
          {t("light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 size-3.5" aria-hidden strokeWidth={2} />
          {t("dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 size-3.5" aria-hidden strokeWidth={2} />
          {t("system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
