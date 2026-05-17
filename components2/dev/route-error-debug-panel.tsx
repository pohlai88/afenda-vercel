"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "#components2/ui/button"
import type { RouteErrorSegment } from "#components2/route-error/use-report-route-error"
import { ui } from "#lib/design-system"

function serializeCause(cause: unknown, depth: number): unknown {
  if (depth > 10) return "[max depth]"
  if (cause === undefined || cause === null) return cause
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack,
      cause: serializeCause(cause.cause, depth + 1),
    }
  }
  return String(cause)
}

export type RouteErrorDebugPanelProps = {
  segment: RouteErrorSegment
  error: Error & { digest?: string }
}

/**
 * Dev-only diagnostics for App Router `error.tsx` — gated like {@link DevSignInPanelGate}.
 * Production builds omit this UI (`NODE_ENV !== "development"`).
 */
export function RouteErrorDebugPanel({
  segment,
  error,
}: RouteErrorDebugPanelProps) {
  const [copied, setCopied] = useState(false)
  const [href, setHref] = useState("")
  const [lang, setLang] = useState<string | undefined>(undefined)
  const [capturedAt, setCapturedAt] = useState<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setHref(`${window.location.pathname}${window.location.search}`)
      setLang(document.documentElement.lang || undefined)
      setCapturedAt(new Date().toISOString())
    })
  }, [])

  const diagnostics = useMemo(() => {
    return {
      segment,
      ts: capturedAt ?? new Date().toISOString(),
      href,
      runtime: "browser" as const,
      lang,
      error: {
        name: error.name,
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        cause: serializeCause(error.cause, 0),
      },
    }
  }, [segment, error, href, lang, capturedAt])

  const jsonText = useMemo(
    () => JSON.stringify(diagnostics, null, 2),
    [diagnostics]
  )

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonText)
      } else {
        const ta = document.createElement("textarea")
        ta.value = jsonText
        ta.setAttribute("readonly", "")
        ta.style.position = "fixed"
        ta.style.left = "-9999px"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [jsonText])

  if (process.env.NODE_ENV !== "development") return null
  if (process.env.NEXT_PUBLIC_DEV_ERROR_PANEL === "0") return null

  return (
    <div
      className={`mt-6 w-full max-w-2xl space-y-3 border border-border bg-card p-surface-md text-left ${ui.radius.panel} ${ui.elevation.card}`}
      data-testid="route-error-debug-panel"
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Dev diagnostics · segment{" "}
        <span className="font-mono text-foreground normal-case">{segment}</span>
      </p>
      <div className="space-y-1 text-sm">
        <p className="font-medium text-foreground">{error.name}</p>
        <p className="text-muted-foreground">{error.message}</p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">
            digest: {error.digest}
          </p>
        ) : null}
      </div>
      <pre
        className={`max-h-80 overflow-auto border border-border bg-background p-3 font-mono text-xs break-words whitespace-pre-wrap text-muted-foreground ${ui.radius.chip}`}
      >
        {error.stack ?? "(no stack)"}
      </pre>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void copy()}
      >
        {copied ? "Copied" : "Copy diagnostics JSON"}
      </Button>
    </div>
  )
}
