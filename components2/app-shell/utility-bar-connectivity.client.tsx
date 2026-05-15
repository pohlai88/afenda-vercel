"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Wifi } from "lucide-react"

import { cn } from "#lib/utils"
import { uiRadius, uiSurfaceElevation } from "#lib/design-system"

import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./utility-bar.client"
import {
  NetworkDiagnosisProgressBar,
  NetworkDiagnosisSummary,
  NetworkDiagnosisVerdictIcon,
  runNetworkDiagnosisChecksWithProgress,
  type NetworkDiagnosisRow,
} from "./utility-bar-network-diagnosis.shared"

// ---------------------------------------------------------------------------
// NetworkInformation (subset) — vendor-prefixed on Navigator
// ---------------------------------------------------------------------------

type NetworkInformationLike = EventTarget & {
  readonly downlink?: number
  readonly downlinkMax?: number
  readonly effectiveType?: "slow-2g" | "2g" | "3g" | "4g"
  readonly rtt?: number
  readonly saveData?: boolean
  readonly type?: string
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
  mozConnection?: NetworkInformationLike
  webkitConnection?: NetworkInformationLike
}

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined
  const n = navigator as NavigatorWithConnection
  return n.connection ?? n.mozConnection ?? n.webkitConnection
}

export type ConnectivityNetworkState = {
  online: boolean
  since: Date
  downlink?: number
  downlinkMax?: number
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g"
  rtt?: number
  saveData?: boolean
  type?: string
}

function readSnapshot(
  conn: NetworkInformationLike | undefined,
  previous?: ConnectivityNetworkState
): ConnectivityNetworkState {
  const online = typeof navigator !== "undefined" ? navigator.onLine : false
  const prevOnline = previous?.online
  const since = previous && online === prevOnline ? previous.since : new Date()

  return {
    online,
    since,
    downlink: conn?.downlink,
    downlinkMax: conn?.downlinkMax,
    effectiveType: conn?.effectiveType,
    rtt: conn?.rtt,
    saveData: conn?.saveData,
    type: conn?.type,
  }
}

/** SSR-safe: undefined until client effect runs. */
function useNetworkState(): ConnectivityNetworkState | undefined {
  const [state, setState] = useState<ConnectivityNetworkState | undefined>(
    undefined
  )

  useEffect(() => {
    const conn = getConnection()

    function update() {
      setState((prev) => readSnapshot(getConnection(), prev))
    }

    update()

    window.addEventListener("online", update, { passive: true })
    window.addEventListener("offline", update, { passive: true })
    conn?.addEventListener("change", update, { passive: true })

    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
      conn?.removeEventListener("change", update)
    }
  }, [])

  return state
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function effectiveTypeLabel(
  et: ConnectivityNetworkState["effectiveType"] | undefined
) {
  if (!et) return null
  const map: Record<NonNullable<typeof et>, string> = {
    "4g": "Excellent",
    "3g": "Good",
    "2g": "Fair",
    "slow-2g": "Poor",
  }
  return map[et]
}

function connectionTypeLabel(t: string | undefined) {
  if (!t) return null
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function connectivityStatus(state: ConnectivityNetworkState) {
  if (!state.online) return "offline" as const
  const et = state.effectiveType
  if (et === "2g" || et === "slow-2g") return "degraded" as const
  return "online" as const
}

type ConnectivityDiagnosisEmbed =
  | { kind: "idle" }
  | { kind: "running"; rows: NetworkDiagnosisRow[] }
  | { kind: "done"; rows: NetworkDiagnosisRow[] }

const CONNECTIVITY_QUICK_STEPS = [
  "Browser online",
  "HTTP round-trip",
  "Connection quality",
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Right-rail connectivity — live browser network snapshot (SSR-safe). */
export function UtilityBarConnectivityPanel() {
  const net = useNetworkState()
  const [embeddedDx, setEmbeddedDx] = useState<ConnectivityDiagnosisEmbed>({
    kind: "idle",
  })

  const runDiagnosisFromConnectivity = useCallback(async () => {
    setEmbeddedDx({ kind: "running", rows: [] })
    try {
      const final = await runNetworkDiagnosisChecksWithProgress((partial) => {
        setEmbeddedDx({ kind: "running", rows: partial })
      })
      setEmbeddedDx({ kind: "done", rows: final })
    } catch {
      setEmbeddedDx({
        kind: "done",
        rows: [
          {
            label: "Diagnosis",
            verdict: "fail",
            detail: "Run failed unexpectedly.",
          },
        ],
      })
    }
  }, [])

  const status = net ? connectivityStatus(net) : "loading"
  const dotColor =
    status === "loading"
      ? "bg-muted-foreground/40"
      : status === "online"
        ? "bg-emerald-500"
        : status === "offline"
          ? "bg-destructive"
          : "bg-amber-500"

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Connectivity"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "relative data-[state=open]:bg-muted/55 data-[state=open]:text-foreground"
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <Wifi strokeWidth={2} />
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute top-0.5 right-0.5 size-1.5 rounded-full ring-1 ring-background",
                  dotColor
                )}
              />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Connectivity
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-80 p-0",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            Connectivity
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Live browser snapshot plus a shortcut to the same three-check
            diagnosis used in the network diagnosis menu.
          </p>
        </div>

        <div className="space-y-3 px-4 py-4">
          {net === undefined ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-3 w-[75%] animate-pulse rounded bg-muted" />
              <div className="h-3 w-[50%] animate-pulse rounded bg-muted" />
              <div className="h-3 w-[66%] animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Status
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-foreground">
                    {status === "online" && "Online"}
                    {status === "offline" && "Offline"}
                    {status === "degraded" && "Degraded"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Since {formatTime(net.since)}
                  </p>
                </div>
                <span
                  aria-hidden
                  className={cn("mt-1 size-2 shrink-0 rounded-full", dotColor)}
                />
              </div>

              {net.type !== undefined && net.type !== "" && (
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Connection type
                  </p>
                  <p className="mt-1 text-[11px] text-foreground">
                    {connectionTypeLabel(net.type) ?? net.type}
                  </p>
                </div>
              )}

              {net.effectiveType !== undefined && (
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Quality
                  </p>
                  <p className="mt-1 text-[11px] text-foreground">
                    {effectiveTypeLabel(net.effectiveType)} ({net.effectiveType}
                    )
                  </p>
                </div>
              )}

              {(net.downlink !== undefined || net.rtt !== undefined) && (
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Bandwidth
                  </p>
                  <p className="mt-1 text-[11px] text-foreground">
                    {net.downlink !== undefined && (
                      <span>{net.downlink} Mbps downlink</span>
                    )}
                    {net.downlink !== undefined && net.rtt !== undefined && (
                      <span className="text-muted-foreground"> · </span>
                    )}
                    {net.rtt !== undefined && (
                      <span>~{net.rtt} ms RTT (estimate)</span>
                    )}
                  </p>
                </div>
              )}

              {net.saveData === true && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <p className="text-[10px] font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-400">
                    Data saver
                  </p>
                  <p className="mt-1 text-[11px] text-foreground">
                    Reduced data usage is enabled on this device.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="border-t border-border/50 pt-3">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Quick diagnosis
            </p>
            {embeddedDx.kind === "idle" && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2 w-full"
                onClick={() => void runDiagnosisFromConnectivity()}
              >
                Run full diagnosis
              </Button>
            )}
            {embeddedDx.kind === "running" && (
              <div className="mt-2 space-y-2" aria-busy="true">
                <NetworkDiagnosisProgressBar
                  completedCount={embeddedDx.rows.length}
                  isRunning
                />
                <ul className="space-y-1.5">
                  {[0, 1, 2].map((i) => {
                    const row = embeddedDx.rows[i]
                    const n = embeddedDx.rows.length
                    const isActive = row === undefined && i === n
                    const isPending = row === undefined && i > n

                    return (
                      <li
                        key={i}
                        className={cn(
                          "flex items-start gap-2 rounded-md border px-2.5 py-2 transition-colors",
                          isActive &&
                            "border-primary/30 bg-primary/5 shadow-sm",
                          row && "border-border/50 bg-card/50",
                          isPending &&
                            "border-dashed border-muted-foreground/25 bg-muted/15"
                        )}
                      >
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        {row ? (
                          <>
                            <NetworkDiagnosisVerdictIcon
                              verdict={row.verdict}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-medium text-foreground">
                                {row.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground tabular-nums">
                                {row.detail}
                              </p>
                            </div>
                          </>
                        ) : isActive ? (
                          <>
                            <Loader2
                              aria-hidden
                              className="size-3.5 shrink-0 animate-spin text-primary"
                              strokeWidth={2}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-medium text-foreground">
                                {CONNECTIVITY_QUICK_STEPS[i]}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                Running…
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 space-y-1 pt-0.5">
                            <div className="h-2 w-[50%] animate-pulse rounded bg-muted" />
                            <div className="h-1.5 w-[30%] animate-pulse rounded bg-muted/80" />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {embeddedDx.kind === "done" && (
              <div className="mt-2 space-y-2">
                <NetworkDiagnosisSummary rows={embeddedDx.rows} />
                <ul className="space-y-1.5">
                  {embeddedDx.rows.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-start gap-2 rounded-md border border-border/50 bg-card/50 px-2.5 py-2"
                    >
                      <NetworkDiagnosisVerdictIcon verdict={row.verdict} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-foreground">
                          {row.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {row.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-[11px]"
                  onClick={() => setEmbeddedDx({ kind: "idle" })}
                >
                  Clear results
                </Button>
              </div>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
