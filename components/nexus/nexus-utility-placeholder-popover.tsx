"use client"

import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#components/ui/popover"
import { cn } from "#lib/utils"

import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"
import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"

type NexusUtilityPlaceholderPopoverProps = {
  widgetKey: "messenger" | "screenshot" | "upload"
  icon: LucideIcon
}

/** Reserved utility slot — empty state until wired to product backends. */
export function NexusUtilityPlaceholderPopover({
  widgetKey,
  icon: Icon,
}: NexusUtilityPlaceholderPopoverProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.placeholders")

  return (
    <Popover>
      <NexusUtilityTriggerTooltip
        tooltip={t(`${widgetKey}.tooltip`)}
        align="end"
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t(`${widgetKey}.trigger`)}
            className={cn(NEXUS_UTILITY_ROUND_CONTROL_CLASS)}
          >
            <Icon className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
          </button>
        </PopoverTrigger>
      </NexusUtilityTriggerTooltip>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="w-72 bg-background/92 p-0 backdrop-blur-2xl"
      >
        <div className="border-b border-border/50 px-4 py-3">
          <p className="text-xs font-medium text-foreground">
            {t(`${widgetKey}.title`)}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <Icon
            className="size-6 text-muted-foreground/40"
            aria-hidden
            strokeWidth={1.5}
          />
          <p className="text-xs text-muted-foreground">
            {t(`${widgetKey}.body`)}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
