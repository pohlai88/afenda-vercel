"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"

import { useCommandPalette } from "./command-palette-context"

/**
 * Subtle search button that opens the command palette.
 * Shows the keyboard shortcut hint (⌘K / Ctrl K) on ≥sm viewports.
 * Rendered in AppTopBar L1 as part of the center slot.
 */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { toggle } = useCommandPalette()
  const t = useTranslations("Dashboard.commandPalette")

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-label={t("triggerLabel")}
      className={cn(
        "h-8 gap-2 px-3 text-sm text-muted-foreground hover:text-foreground",
        "w-full max-w-[240px] justify-start",
        className
      )}
    >
      <Search className="size-3.5 shrink-0" />
      <span className="truncate">{t("triggerLabel")}</span>
      <kbd
        aria-hidden
        className="ml-auto hidden max-w-[88px] shrink-0 truncate rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-block sm:max-w-none"
      >
        {t("kbdHint")}
      </kbd>
    </Button>
  )
}
