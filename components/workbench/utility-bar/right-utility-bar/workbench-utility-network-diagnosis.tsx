"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { cn } from "#lib/utils"

import {
  readBrowserConnectionSnapshot,
  useBrowserOnlineStatus,
} from "../workbench-browser-runtime"
import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "../workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

type DiagnosisState =
  | { status: "idle" }
  | { status: "pending" }
  | {
      status: "success"
      httpStatus: number
      elapsedMs: number
      checkedAt: string
    }
  | {
      status: "error"
      message: string
      elapsedMs: number | null
      checkedAt: string
    }

async function runNetworkDiagnosis(): Promise<DiagnosisState> {
  const checkedAt = new Date().toLocaleTimeString()
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      status: "error",
      message: "offline",
      elapsedMs: null,
      checkedAt,
    }
  }

  const started = performance.now()
  try {
    const response = await fetch(
      `/favicon.ico?afenda-diagnosis=${Date.now()}`,
      {
        method: "HEAD",
        cache: "no-store",
      }
    )
    return {
      status: "success",
      httpStatus: response.status,
      elapsedMs: Math.round(performance.now() - started),
      checkedAt,
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "network"
    return {
      status: "error",
      message,
      elapsedMs: Math.round(performance.now() - started),
      checkedAt,
    }
  }
}

export function WorkbenchUtilityNetworkDiagnosis() {
  const t = useTranslations("Dashboard.shell.utilityBar.diagnosis")
  const isOnline = useBrowserOnlineStatus()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<DiagnosisState>({ status: "idle" })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void runNetworkDiagnosis().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const rerun = async () => {
    setState({ status: "pending" })
    setState(await runNetworkDiagnosis())
  }

  const connection = readBrowserConnectionSnapshot()

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setState({ status: "pending" })
        setOpen(nextOpen)
      }}
    >
      <WorkbenchUtilityTriggerTooltip tooltip={t("tooltip")} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(
              WORKBENCH_UTILITY_ROUND_CONTROL_CLASS,
              state.status === "success" && isOnline
                ? "text-info hover:text-info"
                : undefined
            )}
          >
            <Activity
              className="size-[15px] shrink-0"
              aria-hidden
              strokeWidth={2}
            />
          </button>
        </PopoverTrigger>
      </WorkbenchUtilityTriggerTooltip>

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
            <span className="text-muted-foreground">{t("browserStatus")}</span>
            <span className="font-medium text-foreground">
              {isOnline === null
                ? t("checking")
                : isOnline
                  ? t("online")
                  : t("offline")}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("effectiveType")}</span>
            <span className="font-medium text-foreground">
              {connection?.effectiveType ?? "—"}
            </span>
          </div>

          {state.status === "idle" ? (
            <p className="text-muted-foreground">{t("idle")}</p>
          ) : null}
          {state.status === "pending" ? (
            <p className="text-muted-foreground">{t("pending")}</p>
          ) : null}

          {state.status === "success" ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t("httpStatus")}</span>
                <span className="font-medium text-foreground">
                  {state.httpStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t("latency")}</span>
                <span className="font-medium text-foreground">
                  {state.elapsedMs} ms
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("lastChecked")}
                </span>
                <span className="font-medium text-foreground">
                  {state.checkedAt}
                </span>
              </div>
            </>
          ) : null}

          {state.status === "error" ? (
            <>
              <p className="text-warning-foreground">
                {state.message === "offline"
                  ? t("errorOffline")
                  : t("errorGeneric")}
              </p>
              {state.elapsedMs !== null ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t("latency")}</span>
                  <span className="font-medium text-foreground">
                    {state.elapsedMs} ms
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("lastChecked")}
                </span>
                <span className="font-medium text-foreground">
                  {state.checkedAt}
                </span>
              </div>
            </>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void rerun()}
          >
            {t("run")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
