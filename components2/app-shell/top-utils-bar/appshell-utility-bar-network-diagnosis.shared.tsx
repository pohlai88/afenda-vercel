"use client"

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"

import { cn } from "#lib/utils"

// ---------------------------------------------------------------------------
// Types + browser checks (shared by Connectivity + Diagnosis panels)
// ---------------------------------------------------------------------------

export type NetworkDiagnosisVerdict = "pass" | "warn" | "fail" | "info"

export type NetworkDiagnosisRow = {
  label: string
  verdict: NetworkDiagnosisVerdict
  detail: string
}

type NetworkInformationLike = EventTarget & {
  readonly effectiveType?: "slow-2g" | "2g" | "3g" | "4g"
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
  mozConnection?: NetworkInformationLike
  webkitConnection?: NetworkInformationLike
}

function getConnectionForDiagnosis(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined
  const n = navigator as NavigatorWithConnection
  return n.connection ?? n.mozConnection ?? n.webkitConnection
}

async function measureFaviconHead(): Promise<
  { ok: true; ms: number } | { ok: false; error: string }
> {
  try {
    const t0 = performance.now()
    const res = await fetch("/favicon.ico", {
      method: "HEAD",
      cache: "no-store",
    })
    const ms = Math.round(performance.now() - t0)
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true, ms }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed"
    return { ok: false, error: msg }
  }
}

function verdictForLatency(ms: number): NetworkDiagnosisVerdict {
  if (ms < 150) return "pass"
  if (ms <= 500) return "warn"
  return "fail"
}

function verdictForEffectiveType(
  et: "slow-2g" | "2g" | "3g" | "4g" | undefined
): NetworkDiagnosisVerdict {
  if (et === undefined) return "info"
  if (et === "4g") return "pass"
  if (et === "3g") return "warn"
  return "fail"
}

/**
 * Runs the same three checks as the Network diagnosis rail panel.
 * Optional `onPartial` receives rows after each step (for progressive UI).
 */
export async function runNetworkDiagnosisChecksWithProgress(
  onPartial?: (rows: NetworkDiagnosisRow[]) => void
): Promise<NetworkDiagnosisRow[]> {
  onPartial?.([])

  const online = navigator.onLine
  const row1: NetworkDiagnosisRow = {
    label: "Browser online",
    verdict: online ? "pass" : "fail",
    detail: online ? "Navigator reports online" : "Navigator reports offline",
  }
  onPartial?.([row1])

  const latency = await measureFaviconHead()
  const row2: NetworkDiagnosisRow = !latency.ok
    ? {
        label: "HTTP round-trip",
        verdict: "fail",
        detail: latency.error,
      }
    : {
        label: "HTTP round-trip",
        verdict: verdictForLatency(latency.ms),
        detail: `${latency.ms} ms (HEAD /favicon.ico)`,
      }
  onPartial?.([row1, row2])

  const et = getConnectionForDiagnosis()?.effectiveType
  const row3: NetworkDiagnosisRow =
    et === undefined
      ? {
          label: "Connection quality",
          verdict: "info",
          detail: "Not available in this browser",
        }
      : {
          label: "Connection quality",
          verdict: verdictForEffectiveType(et),
          detail: `effectiveType: ${et}`,
        }

  const all = [row1, row2, row3]
  onPartial?.(all)
  return all
}

export function worstNetworkDiagnosisVerdict(
  rows: NetworkDiagnosisRow[]
): NetworkDiagnosisVerdict {
  if (rows.some((r) => r.verdict === "fail")) return "fail"
  if (rows.some((r) => r.verdict === "warn")) return "warn"
  if (rows.some((r) => r.verdict === "info")) return "info"
  return "pass"
}

export function NetworkDiagnosisVerdictIcon({
  verdict,
}: {
  verdict: NetworkDiagnosisVerdict
}) {
  const common = "size-4 shrink-0"
  switch (verdict) {
    case "pass":
      return (
        <CheckCircle2
          aria-hidden
          className={cn(common, "text-emerald-600 dark:text-emerald-400")}
          strokeWidth={2}
        />
      )
    case "warn":
      return (
        <AlertTriangle
          aria-hidden
          className={cn(common, "text-amber-600 dark:text-amber-400")}
          strokeWidth={2}
        />
      )
    case "fail":
      return (
        <XCircle
          aria-hidden
          className={cn(common, "text-destructive")}
          strokeWidth={2}
        />
      )
    case "info":
      return (
        <Info
          aria-hidden
          className={cn(common, "text-muted-foreground")}
          strokeWidth={2}
        />
      )
  }
}

export function NetworkDiagnosisSummary({
  rows,
}: {
  rows: NetworkDiagnosisRow[]
}) {
  const worst = worstNetworkDiagnosisVerdict(rows)
  const copy =
    worst === "fail"
      ? "Issues detected — one or more checks failed."
      : worst === "warn"
        ? "Degraded — review warnings below."
        : worst === "info"
          ? "Completed — see informational notes below."
          : "All checks passed — network path looks healthy."

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5",
        worst === "fail" &&
          "border-destructive/35 bg-destructive/10 text-destructive",
        worst === "warn" &&
          "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        worst === "info" && "border-border bg-muted/40 text-foreground",
        worst === "pass" &&
          "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
      )}
    >
      <p className="text-[10px] font-semibold tracking-widest uppercase opacity-80">
        Summary
      </p>
      <p className="mt-1 text-[11px] leading-snug font-medium">{copy}</p>
    </div>
  )
}

export function NetworkDiagnosisProgressBar({
  completedCount,
  isRunning,
}: {
  completedCount: number
  isRunning: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-muted-foreground">
          Progress
        </span>
        <span className="text-[10px] font-semibold text-foreground tabular-nums">
          {isRunning ? `${Math.min(completedCount + 1, 3)} / 3` : "3 / 3"}
        </span>
      </div>
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label={`Diagnosis progress, ${completedCount} of 3 checks complete`}
      >
        {[0, 1, 2].map((i) => {
          const filled = i < completedCount
          const active = isRunning && i === completedCount
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                filled && "bg-primary",
                !filled && !active && "bg-muted",
                active && "bg-primary/55 motion-safe:animate-pulse"
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
