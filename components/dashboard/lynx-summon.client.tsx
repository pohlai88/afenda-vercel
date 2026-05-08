"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Sparkles, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { Button } from "#components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "#components/ui/sheet"
import { Link } from "#i18n/navigation"
import {
  LYNX_ERP_HTTP_ROUTES,
  parseLynxTruthMarkdown,
  type LynxTruthEvidenceDTO,
} from "#features/lynx/client"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { cn } from "#lib/utils"

import { buildGroundedTruthQuestion } from "./lynx-grounded-truth-question.shared"
import {
  useLynxSummon,
  type LynxGrounding,
} from "./lynx-summon-context"

/**
 * Floating Lynx summon — TanStack-style fixed icon at bottom-right.
 *
 * Drawer feed is **grounded on the open operational atom** with automatic
 * Truth retrieval (no primary free-text field — plan trade-off §2.7). Deep
 * links to Knowledge + Lynx modules satisfy the multi-layer affordance
 * without turning this shell into a chat surface.
 */

type StreamState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "done"
      evidence: LynxTruthEvidenceDTO[]
      limitationsPreamble: string
      rawMarkdown: string
    }
  | { status: "error"; message: string }

async function consumeTruthStream(
  question: string,
  messages: { errorGeneric: string; errorStream: string }
): Promise<
  | {
      ok: true
      evidence: LynxTruthEvidenceDTO[]
      limitationsPreamble: string
      rawMarkdown: string
    }
  | { ok: false; message: string }
> {
  const res = await fetch(LYNX_ERP_HTTP_ROUTES.truthSearch, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })

  if (!res.ok) {
    let message = messages.errorGeneric
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* ignore */
    }
    return { ok: false, message }
  }

  if (!res.body) {
    return { ok: false, message: messages.errorGeneric }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let evidence: LynxTruthEvidenceDTO[] = []
  let limitationsPreamble = ""
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
          limitationsPreamble?: string
          delta?: string
          message?: string
        }
        if (obj.type === "error" && typeof obj.message === "string") {
          return { ok: false, message: obj.message }
        }
        if (obj.type === "evidence" && Array.isArray(obj.evidence)) {
          evidence = obj.evidence
          limitationsPreamble = obj.limitationsPreamble ?? ""
        } else if (obj.type === "delta" && typeof obj.delta === "string") {
          rawMarkdown += obj.delta
        }
      } catch {
        return { ok: false, message: messages.errorStream }
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

  return {
    ok: true,
    evidence,
    limitationsPreamble,
    rawMarkdown,
  }
}

function GroundingHeader({ grounding }: { grounding: LynxGrounding | null }) {
  const t = useTranslations("Dashboard.LynxSummon")

  if (!grounding) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2.5">
        <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("groundingNoneLabel")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("groundingNoneDescription")}
        </p>
      </div>
    )
  }

  const chips = grounding.chips?.slice(0, 3) ?? []

  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {t("groundingLabel")}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
        {grounding.title}
      </p>
      {grounding.summary ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {grounding.summary}
        </p>
      ) : null}
      {chips.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={`${chip.module}:${chip.label}:${i}`}
              className="inline-flex items-center gap-1 rounded-sm border bg-card px-1.5 py-0.5 text-[10.5px] text-muted-foreground"
            >
              <span className="font-mono text-[9px] font-semibold tracking-wider text-primary">
                {chip.module}
              </span>
              <span className="text-foreground">{chip.label}</span>
              {chip.meta ? (
                <span className="font-mono text-[9px] text-muted-foreground">
                  {chip.meta}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TruthFeed({
  grounding,
  sheetOpen,
}: {
  grounding: LynxGrounding | null
  sheetOpen: boolean
}) {
  const t = useTranslations("Dashboard.LynxSummon")
  const [state, setState] = useState<StreamState>({ status: "idle" })

  const groundedQuestion = useMemo(
    () => buildGroundedTruthQuestion(grounding),
    [grounding]
  )

  const runRetrieval = useCallback(
    async (question: string) => {
      setState({ status: "loading" })
      const result = await consumeTruthStream(question, {
        errorGeneric: t("errorGeneric"),
        errorStream: t("errorStream"),
      })
      if (!result.ok) {
        setState({ status: "error", message: result.message })
        return
      }
      setState({
        status: "done",
        evidence: result.evidence,
        limitationsPreamble: result.limitationsPreamble,
        rawMarkdown: result.rawMarkdown,
      })
    },
    [t]
  )

  useEffect(() => {
    if (!sheetOpen || !groundedQuestion) return
    // Defer past the effect tick so the loading transition is not a sync
    // setState directly inside the effect body (react-hooks/set-state-in-effect).
    const handle = requestAnimationFrame(() => {
      void runRetrieval(groundedQuestion)
    })
    return () => cancelAnimationFrame(handle)
  }, [sheetOpen, groundedQuestion, runRetrieval])

  const parsed = useMemo(() => {
    if (state.status !== "done") return null
    return parseLynxTruthMarkdown(state.rawMarkdown)
  }, [state])

  if (!groundedQuestion) {
    return (
      <p className="text-sm text-muted-foreground">{t("truthIdleNoAtom")}</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("truthLabel")}
          </p>
          <p className="line-clamp-4 text-xs text-muted-foreground">
            <span className="font-mono text-[10px] text-primary uppercase">
              {t("groundedQueryLabel")}{" "}
            </span>
            {groundedQuestion}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={state.status === "loading"}
          onClick={() => void runRetrieval(groundedQuestion)}
        >
          {state.status === "loading" ? t("pending") : t("refreshTruth")}
        </Button>
      </div>

      {state.status === "error" ? (
        <p className="text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-xs text-muted-foreground">{t("retrievingTruth")}</p>
      ) : null}

      {state.status === "done" ? (
        <div className="space-y-4 border-t pt-3">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("answerLabel")}
            </p>
            <div className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
              {parsed?.answer || state.rawMarkdown || "—"}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("evidenceLabel")}
            </p>
            {state.evidence.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("evidenceEmpty")}
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {state.evidence.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {row.title}
                    </span>
                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                      d={row.distance.toFixed(3)}
                    </span>
                    <p className="mt-1 line-clamp-3 text-muted-foreground">
                      {row.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state.limitationsPreamble || parsed?.limitations ? (
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("limitationsLabel")}
              </p>
              {state.limitationsPreamble ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {state.limitationsPreamble}
                </p>
              ) : null}
              {parsed?.limitations ? (
                <div className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                  {parsed.limitations}
                </div>
              ) : null}
            </div>
          ) : null}

          {parsed?.nextSafeAction ? (
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("nextActionLabel")}
              </p>
              <div className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                {parsed.nextSafeAction}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DeepDiveLinks() {
  const t = useTranslations("Dashboard.LynxSummon")
  const envelope = useRouteEnvelope()
  const slug = envelope?.orgSlug?.trim()
  if (!slug) return null

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {t("deepDiveLabel")}
      </p>
      <div className="flex flex-col gap-2 text-sm">
        <Link
          href={organizationDashboardPath(slug, "knowledge")}
          prefetch={false}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("openKnowledge")}
        </Link>
        <Link
          href={organizationDashboardPath(slug, "lynx")}
          prefetch={false}
          className="text-primary underline-offset-4 hover:underline"
        >
          {t("openOperatorAssist")}
        </Link>
      </div>
    </div>
  )
}

export function LynxSummon() {
  const t = useTranslations("Dashboard.LynxSummon")
  const { grounding, open, openSummon, closeSummon, toggleSummon } =
    useLynxSummon()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (isTyping) return
      if (e.key === "?" && !open) {
        openSummon()
        e.preventDefault()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [open, openSummon])

  return (
    <>
      <Button
        type="button"
        size="icon-lg"
        variant="default"
        aria-label={t("triggerAria")}
        aria-expanded={open}
        aria-keyshortcuts="?"
        onClick={toggleSummon}
        className={cn(
          "fixed right-5 bottom-5 z-40 rounded-full shadow-elevation-2",
          "transition-transform motion-safe:hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100",
          grounding ? "" : "opacity-90"
        )}
      >
        <Sparkles className="size-5" aria-hidden />
        {grounding ? (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary-foreground/90 ring-2 ring-primary"
          />
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={(next) => (next ? openSummon() : closeSummon())}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            "flex w-full flex-col gap-4 p-0 sm:max-w-md",
            "motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none motion-reduce:!transition-none"
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b px-5 pt-5 pb-4">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {t("eyebrow")}
              </p>
              <SheetTitle className="text-base font-semibold tracking-tight">
                {t("title")}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {t("description")}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeSummon}
              aria-label={t("closeAria")}
            >
              <X className="size-4" />
            </Button>
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6">
            <GroundingHeader grounding={grounding} />
            <TruthFeed
              key={grounding?.id ?? "no-grounding"}
              grounding={grounding}
              sheetOpen={open}
            />
            <DeepDiveLinks />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
