"use client"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Kbd } from "#components/ui/kbd"
import { cn } from "#lib/utils"

import { useWorkbenchCommand } from "../workbench-command"

/**
 * Primary L1 command launcher.
 * Presents the command surface as a searchable shell control instead of a
 * generic magnifying-glass button.
 */
export function WorkbenchCommandTrigger({ className }: { className?: string }) {
  const { openCommand } = useWorkbenchCommand()
  const t = useTranslations("Dashboard.commandPalette")

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => openCommand()}
      aria-label={t("triggerLabel")}
      className={cn(
        "af-nexus-round-control-backdrop h-7 w-full max-w-32 min-w-0 rounded-full! border-border/60 bg-card/72 px-2 text-muted-foreground shadow-elevation-1 transition-all hover:bg-card/92 hover:text-foreground sm:max-w-36 sm:px-2.5",
        className
      )}
    >
      <span className="flex min-w-0 flex-1 items-center">
        <span className="min-w-0 truncate text-left text-xs font-medium text-foreground/88">
          {t("triggerLabel")}
        </span>
      </span>
      <span className="ml-2 flex shrink-0 items-center">
        <Kbd className="hidden h-4.5 min-w-0 px-1 text-[10px] sm:inline-flex">
          ⌘+K
        </Kbd>
      </span>
    </Button>
  )
}
