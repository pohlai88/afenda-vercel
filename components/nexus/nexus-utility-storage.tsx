"use client"

import { useState } from "react"
import { Database } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#components/ui/popover"
import { cn } from "#lib/utils"

import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"
import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"

type StorageSnapshot = {
  localAvailable: boolean
  sessionAvailable: boolean
  cookiesEnabled: boolean
  localKeys: string[]
  sessionKeys: string[]
}

function listInterestingKeys(storage: Storage | null): string[] {
  if (!storage) return []

  const out: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key) continue
    if (
      key.startsWith("afenda") ||
      key.startsWith("sidebar_") ||
      key.startsWith("inspector_") ||
      key === "NEXT_LOCALE"
    ) {
      out.push(key)
    }
  }
  return out.sort()
}

function readStorageSnapshot(): StorageSnapshot {
  let localStorageRef: Storage | null = null
  let sessionStorageRef: Storage | null = null

  try {
    localStorageRef = window.localStorage
  } catch {
    localStorageRef = null
  }

  try {
    sessionStorageRef = window.sessionStorage
  } catch {
    sessionStorageRef = null
  }

  return {
    localAvailable: localStorageRef !== null,
    sessionAvailable: sessionStorageRef !== null,
    cookiesEnabled: navigator.cookieEnabled,
    localKeys: listInterestingKeys(localStorageRef),
    sessionKeys: listInterestingKeys(sessionStorageRef),
  }
}

export function NexusUtilityStorage() {
  const t = useTranslations("Dashboard.shell.utilityBar.storage")
  const [open, setOpen] = useState(false)
  const snapshot = open ? readStorageSnapshot() : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <NexusUtilityTriggerTooltip tooltip={t("tooltip")} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(NEXUS_UTILITY_ROUND_CONTROL_CLASS)}
          >
            <Database
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
        className="af-nexus-popover-panel w-80 bg-background/92 p-0"
      >
        <div className="border-b border-border/50 px-4 py-3">
          <p className="text-xs font-medium text-foreground">{t("title")}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("localStorage")}</span>
            <span className="font-medium text-foreground">
              {snapshot?.localAvailable ? t("available") : t("blocked")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("sessionStorage")}</span>
            <span className="font-medium text-foreground">
              {snapshot?.sessionAvailable ? t("available") : t("blocked")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("cookies")}</span>
            <span className="font-medium text-foreground">
              {snapshot?.cookiesEnabled ? t("enabled") : t("disabled")}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground">{t("localKeys")}</p>
            {snapshot && snapshot.localKeys.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {snapshot.localKeys.map((key) => (
                  <code
                    key={key}
                    className="rounded-md bg-muted px-1.5 py-1 text-[11px] text-foreground"
                  >
                    {key}
                  </code>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("empty")}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-muted-foreground">{t("sessionKeys")}</p>
            {snapshot && snapshot.sessionKeys.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {snapshot.sessionKeys.map((key) => (
                  <code
                    key={key}
                    className="rounded-md bg-muted px-1.5 py-1 text-[11px] text-foreground"
                  >
                    {key}
                  </code>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("empty")}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
