"use client"

import { Bell } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#components/ui/popover"
import { organizationNexusPath } from "#features/nexus"
import { cn } from "#lib/utils"

import { NexusPressureItem } from "./nexus-pressure-item"
import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"
import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"
import type { OperationalPressureItem } from "./nexus.types"

type NexusUtilityNotificationsProps = {
  orgSlug: string
  items: OperationalPressureItem[]
}

function notificationsBadgeClass(items: OperationalPressureItem[]): string {
  if (
    items.some(
      (i) => i.severity === "emergency" || i.severity === "critical"
    )
  ) {
    return "bg-destructive"
  }
  return "bg-amber-500"
}

/**
 * L1 notifications tray — surfaces operational pressure (high/critical iThink)
 * with a severity badge on the bell and a path to the Nexus field.
 */
export function NexusUtilityNotifications({
  orgSlug,
  items,
}: NexusUtilityNotificationsProps) {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const nexusHref = organizationNexusPath(orgSlug)
  const hasItems = items.length > 0

  return (
    <Popover>
      <NexusUtilityTriggerTooltip tooltip={t("notificationsTooltip")} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              hasItems
                ? `${t("notifications")}. ${t("notificationsCount", { count: items.length })}`
                : t("notifications")
            }
            className={cn(
              NEXUS_UTILITY_ROUND_CONTROL_CLASS,
              "relative"
            )}
          >
            <Bell className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
            {hasItems ? (
              <span
                className={cn(
                  "absolute right-0.5 top-0.5 size-2 rounded-full ring-2 ring-background",
                  notificationsBadgeClass(items)
                )}
                aria-hidden
              />
            ) : null}
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
            {hasItems
              ? t("notificationsCount", { count: items.length })
              : t("notificationsTitle")}
          </p>
        </div>

        {hasItems ? (
          <>
            <ul className="max-h-72 list-none overflow-y-auto p-0">
              {items.map((item) => (
                <NexusPressureItem key={item.id} item={item} />
              ))}
            </ul>
            <div className="border-t border-border/50 px-4 py-2.5">
              <Link
                href={nexusHref}
                className="text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {t("notificationsViewAll")}
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <Bell
              className="size-6 text-muted-foreground/40"
              aria-hidden
              strokeWidth={1.5}
            />
            <p className="text-xs text-muted-foreground">
              {t("notificationsEmpty")}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
