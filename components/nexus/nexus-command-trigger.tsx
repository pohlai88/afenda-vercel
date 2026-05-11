"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"

import { useNexusCommand } from "./nexus-command-context"

/**
 * Circular search ring in the utility bar center slot.
 * Relies on `NexusCommandProvider` in the shell tree.
 */
export function NexusCommandTrigger({ className }: { className?: string }) {
  const { toggleCommand } = useNexusCommand()
  const t = useTranslations("Dashboard.commandPalette")

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleCommand}
      aria-label={t("triggerLabel")}
      className={cn(
        "af-nexus-round-control-backdrop size-[28px]! min-h-0! rounded-full! border-border/60 bg-card/72 p-0! text-muted-foreground shadow-elevation-1 transition-all hover:bg-card/92 hover:text-foreground",
        className
      )}
    >
      <Search className="size-3.5 shrink-0 text-foreground/70" />
    </Button>
  )
}
