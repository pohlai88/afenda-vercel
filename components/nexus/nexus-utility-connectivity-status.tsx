"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#components/ui/popover"
import { cn } from "#lib/utils"

import {
  readBrowserConnectionSnapshot,
  useBrowserOnlineStatus,
  type BrowserConnectionSnapshot,
} from "./nexus-browser-runtime"
import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"
import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"

function formatNumber(value: number | null, digits = 0) {
  if (value === null) return "—"
  return digits > 0 ? value.toFixed(digits) : value.toFixed(0)
}

export function NexusUtilityConnectivityStatus() {
  const t = useTranslations("Dashboard.shell.utilityBar.connectivity")
  const isOnline = useBrowserOnlineStatus()
  const [connection, setConnection] = useState<BrowserConnectionSnapshot | null>(
    null
  )

  useEffect(() => {
    const sync = () => setConnection(readBrowserConnectionSnapshot())
    sync()

    const navigatorConnection = (
      navigator as Navigator & {
        connection?: {
          addEventListener?: (type: "change", listener: () => void) => void
          removeEventListener?: (type: "change", listener: () => void) => void
        }
      }
    ).connection

    navigatorConnection?.addEventListener?.("change", sync)
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => {
      navigatorConnection?.removeEventListener?.("change", sync)
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
    }
  }, [])

  const Icon = isOnline ? Wifi : WifiOff
  const tooltip = isOnline ? t("tooltipOnline") : t("tooltipOffline")

  return (
    <Popover>
      <NexusUtilityTriggerTooltip tooltip={tooltip} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(
              NEXUS_UTILITY_ROUND_CONTROL_CLASS,
              isOnline
                ? "text-success hover:text-success"
                : "text-warning-foreground hover:text-warning-foreground"
            )}
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
          <p className="text-xs font-medium text-foreground">{t("title")}</p>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("status")}</span>
            <span
              className={cn(
                "font-medium",
                isOnline ? "text-success" : "text-warning-foreground"
              )}
            >
              {isOnline ? t("statusOnline") : t("statusOffline")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("effectiveType")}</span>
            <span className="font-medium text-foreground">
              {connection?.effectiveType ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("downlink")}</span>
            <span className="font-medium text-foreground">
              {connection?.downlinkMbps == null
                ? "—"
                : `${formatNumber(connection.downlinkMbps, 1)} Mbps`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("rtt")}</span>
            <span className="font-medium text-foreground">
              {connection?.rttMs == null
                ? "—"
                : `${formatNumber(connection.rttMs)} ms`}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("saveData")}</span>
            <span className="font-medium text-foreground">
              {connection?.saveData ? t("on") : t("off")}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
