"use client"

import { useCallback, useState } from "react"
import { Activity, Loader2 } from "lucide-react"

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

type DiagnosisPhase =
  | { kind: "idle" }
  | { kind: "running"; rows: NetworkDiagnosisRow[] }
  | { kind: "done"; rows: NetworkDiagnosisRow[] }

const STEP_TITLES = [
  "Browser online",
  "HTTP round-trip",
  "Connection quality",
] as const

const STEP_HINTS = [
  "Reading navigator.onLine…",
  "HEAD /favicon.ico (no-store)…",
  "Reading Network Information API…",
] as const

// ---------------------------------------------------------------------------

/** Right-rail network diagnosis — manual checks (no auto-fetch on open). */
export function UtilityBarDiagnosisPanel() {
  const [phase, setPhase] = useState<DiagnosisPhase>({ kind: "idle" })

  const runDiagnosis = useCallback(async () => {
    setPhase({ kind: "running", rows: [] })
    const final = await runNetworkDiagnosisChecksWithProgress((partial) => {
      setPhase({ kind: "running", rows: partial })
    })
    setPhase({ kind: "done", rows: final })
  }, [])

  const completedForBar =
    phase.kind === "running" ? phase.rows.length : phase.kind === "done" ? 3 : 0

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Network diagnosis"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground"
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <Activity strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Network diagnosis
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
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
            Network diagnosis
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Runs three checks in sequence with live progress. Nothing runs until
            you start.
          </p>
        </div>

        <div className="space-y-3 px-4 py-4">
          {phase.kind === "idle" && (
            <div className="flex justify-center py-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void runDiagnosis()}
              >
                Run diagnosis
              </Button>
            </div>
          )}

          {(phase.kind === "running" || phase.kind === "done") && (
            <>
              <NetworkDiagnosisProgressBar
                completedCount={completedForBar}
                isRunning={phase.kind === "running"}
              />

              {phase.kind === "done" && (
                <NetworkDiagnosisSummary rows={phase.rows} />
              )}

              <ul className="space-y-2" aria-live="polite">
                {[0, 1, 2].map((i) => {
                  const row = phase.rows[i]
                  const isActiveSpinner =
                    phase.kind === "running" && i === completedForBar
                  const isPending =
                    phase.kind === "running" && i > completedForBar

                  return (
                    <li
                      key={i}
                      className={cn(
                        "rounded-md border px-3 py-2.5 transition-colors duration-200",
                        isActiveSpinner &&
                          "border-primary/30 bg-primary/5 shadow-sm",
                        row && !isActiveSpinner && "border-border/60 bg-card",
                        isPending && "border-dashed border-muted-foreground/25 bg-muted/20"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        {row ? (
                          <>
                            <NetworkDiagnosisVerdictIcon verdict={row.verdict} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-foreground">
                                {row.label}
                              </p>
                              <p className="mt-0.5 text-right text-[10px] text-muted-foreground tabular-nums">
                                {row.detail}
                              </p>
                            </div>
                          </>
                        ) : isActiveSpinner ? (
                          <>
                            <Loader2
                              aria-hidden
                              className="size-4 shrink-0 animate-spin text-primary"
                              strokeWidth={2}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-foreground">
                                {STEP_TITLES[i]}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {STEP_HINTS[i]}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                            <div className="h-2.5 w-[55%] animate-pulse rounded bg-muted" />
                            <div className="h-2 w-[35%] animate-pulse rounded bg-muted/80" />
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {phase.kind === "done" && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPhase({ kind: "idle" })}
              >
                Run again
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
