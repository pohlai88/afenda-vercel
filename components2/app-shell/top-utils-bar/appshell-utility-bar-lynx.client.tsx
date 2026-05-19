"use client"

import { useCallback, useRef, useState } from "react"
import type { Route } from "next"
import { Loader2, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"
import {
  LYNX_ERP_HTTP_ROUTES,
  parseLynxTruthMarkdown,
  type LynxTruthEvidenceDTO,
} from "#features/lynx/client"

import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import {
  APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
  APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS,
} from "./appshell-utility-bar-dropdown-chrome.shared"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"

// ---------------------------------------------------------------------------
// Stream phase
// ---------------------------------------------------------------------------

type StreamPhase =
  | { kind: "idle" }
  | { kind: "streaming"; raw: string; evidenceCount: number }
  | {
      kind: "done"
      answer: string
      raw: string
      evidenceCount: number
    }
  | { kind: "error"; message: string }

// ---------------------------------------------------------------------------

export type UtilityBarLynxPanelProps = {
  /** Locale-prefixed Lynx dashboard href (same as former insight link). */
  href: Route
}

/**
 * Right-rail Lynx quick panel — Truth Retrieval via existing NDJSON API.
 * Full Lynx surface remains on the dashboard route (`href`).
 */
export function UtilityBarLynxPanel({ href }: UtilityBarLynxPanelProps) {
  const tBar = useTranslations("Dashboard.shell.utilityBar.lynxPanel")
  const tTruth = useTranslations("Dashboard.Lynx.truth")

  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [phase, setPhase] = useState<StreamPhase>({ kind: "idle" })
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(async () => {
    const q = question.trim()
    if (!q) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setPhase({ kind: "streaming", raw: "", evidenceCount: 0 })

    try {
      const res = await fetch(LYNX_ERP_HTTP_ROUTES.truthSearch, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: ac.signal,
      })

      if (!res.ok) {
        let message = tTruth("errorGeneric")
        try {
          const data = (await res.json()) as { error?: string }
          if (data.error) message = data.error
        } catch {
          /* ignore */
        }
        setPhase({ kind: "error", message })
        return
      }

      if (!res.body) {
        setPhase({ kind: "error", message: tTruth("errorGeneric") })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let evidence: LynxTruthEvidenceDTO[] = []
      let rawMarkdown = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const obj = JSON.parse(line) as {
              type?: string
              evidence?: LynxTruthEvidenceDTO[]
              delta?: string
              message?: string
            }
            if (obj.type === "error" && typeof obj.message === "string") {
              setPhase({ kind: "error", message: obj.message })
              return
            }
            if (obj.type === "evidence" && Array.isArray(obj.evidence)) {
              evidence = obj.evidence
              setPhase({
                kind: "streaming",
                raw: rawMarkdown,
                evidenceCount: evidence.length,
              })
            } else if (obj.type === "delta" && typeof obj.delta === "string") {
              rawMarkdown += obj.delta
              setPhase({
                kind: "streaming",
                raw: rawMarkdown,
                evidenceCount: evidence.length,
              })
            }
          } catch {
            setPhase({ kind: "error", message: tTruth("errorStream") })
            return
          }
        }
      }

      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer) as { type?: string; delta?: string }
          if (obj.type === "delta" && typeof obj.delta === "string") {
            rawMarkdown += obj.delta
          }
        } catch {
          /* trailing incomplete line */
        }
      }

      const parsed = parseLynxTruthMarkdown(rawMarkdown)
      setPhase({
        kind: "done",
        answer: parsed.answer || rawMarkdown || "—",
        raw: rawMarkdown,
        evidenceCount: evidence.length,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return
      }
      setPhase({ kind: "error", message: tTruth("errorGeneric") })
    }
  }, [question, tTruth])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      abortRef.current?.abort()
      abortRef.current = null
      setPhase({ kind: "idle" })
    }
  }

  const isBusy = phase.kind === "streaming"

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={tBar("triggerAriaLabel")}
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <Sparkles strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          {tBar("triggerTooltip")}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "flex max-h-[min(28rem,calc(100vh-6rem))] w-80 flex-col overflow-hidden p-0",
          APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS
        )}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            {tBar("headerTitle")}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {tBar("headerSubtitle")}
          </p>
        </div>

        <div className="shrink-0 space-y-2 border-b border-border/40 px-3 py-2">
          <label htmlFor="utility-bar-lynx-question" className="sr-only">
            {tTruth("labelQuestion")}
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="utility-bar-lynx-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={tTruth("placeholderQuestion")}
              disabled={isBusy}
              className="h-8 min-w-0 flex-1 text-[11px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void runSearch()
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-8 shrink-0"
              disabled={isBusy || !question.trim()}
              aria-label={tTruth("submit")}
              onClick={() => void runSearch()}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {phase.kind === "idle" ? (
            <p className="text-[10px] leading-snug text-muted-foreground">
              {tBar("idleHint")}
            </p>
          ) : null}

          {phase.kind === "error" ? (
            <p className="text-[10px] text-destructive" role="alert">
              {phase.message}
            </p>
          ) : null}

          {phase.kind === "streaming" ? (
            <div className="space-y-2">
              {phase.evidenceCount > 0 ? (
                <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
                  {tBar("evidenceCount", { count: phase.evidenceCount })}
                </p>
              ) : null}
              <div className="max-h-40 overflow-y-auto rounded-md border border-border/50 bg-muted/20 p-2 text-[10px] leading-snug whitespace-pre-wrap text-foreground/90">
                {phase.raw || (
                  <span className="text-muted-foreground">
                    {tTruth("pending")}
                  </span>
                )}
              </div>
            </div>
          ) : null}

          {phase.kind === "done" ? (
            <div className="space-y-2">
              {phase.evidenceCount > 0 ? (
                <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
                  {tBar("evidenceCount", { count: phase.evidenceCount })}
                </p>
              ) : null}
              <div className="max-h-48 overflow-y-auto rounded-md border border-border/50 bg-muted/20 p-2 text-[10px] leading-snug whitespace-pre-wrap text-foreground/90">
                {phase.answer}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border/50 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-center text-[10px]"
            asChild
          >
            <Link href={href} prefetch={false}>
              {tBar("openFullLynx")}
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
