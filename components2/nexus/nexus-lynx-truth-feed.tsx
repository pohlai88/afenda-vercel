"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import {
  LYNX_ERP_HTTP_ROUTES,
  parseLynxTruthMarkdown,
  type LynxTruthEvidenceDTO,
} from "#features/lynx/client"

import { buildGroundedTruthQuestion } from "./nexus-lynx-grounded-truth-question.shared"
import type { LynxGrounding } from "./nexus-lynx-summon-context"

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

  return { ok: true, evidence, limitationsPreamble, rawMarkdown }
}

export function TruthFeed({
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

  const runRetrievalRef = useRef(runRetrieval)
  useEffect(() => {
    runRetrievalRef.current = runRetrieval
  }, [runRetrieval])

  useEffect(() => {
    if (!sheetOpen || !groundedQuestion) return
    // Defer past the effect tick so the loading transition is not a sync
    // setState directly inside the effect body (react-hooks/set-state-in-effect).
    const handle = requestAnimationFrame(() => {
      void runRetrievalRef.current(groundedQuestion)
    })
    return () => cancelAnimationFrame(handle)
    // Intentionally omit `runRetrieval`: next-intl's `t` can change identity and
    // would retrigger this effect every render while the sheet is open.
  }, [sheetOpen, groundedQuestion])

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
