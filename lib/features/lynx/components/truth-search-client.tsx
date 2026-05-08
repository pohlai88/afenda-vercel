"use client"

import { useCallback, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"

import type { LynxTruthEvidenceDTO } from "#features/lynx/types"
import { LYNX_ERP_HTTP_ROUTES } from "../lynx.contract"
import { parseLynxTruthMarkdown } from "#features/lynx/schemas/truth-markdown"

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

export function TruthSearchClient() {
  const t = useTranslations("Dashboard.Lynx.truth")
  const [question, setQuestion] = useState("")
  const [state, setState] = useState<StreamState>({ status: "idle" })

  const parsed = useMemo(() => {
    if (state.status !== "done") return null
    return parseLynxTruthMarkdown(state.rawMarkdown)
  }, [state])

  const runSearch = useCallback(async () => {
    const q = question.trim()
    if (!q) return

    setState({ status: "loading" })
    try {
      const res = await fetch(LYNX_ERP_HTTP_ROUTES.truthSearch, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      })

      if (!res.ok) {
        let message = t("errorGeneric")
        try {
          const data = (await res.json()) as { error?: string }
          if (data.error) message = data.error
        } catch {
          /* ignore */
        }
        setState({ status: "error", message })
        return
      }

      if (!res.body) {
        setState({ status: "error", message: t("errorGeneric") })
        return
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
              setState({ status: "error", message: obj.message })
              return
            }
            if (obj.type === "evidence" && Array.isArray(obj.evidence)) {
              evidence = obj.evidence
              limitationsPreamble = obj.limitationsPreamble ?? ""
            } else if (obj.type === "delta" && typeof obj.delta === "string") {
              rawMarkdown += obj.delta
            }
          } catch {
            setState({ status: "error", message: t("errorStream") })
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

      setState({
        status: "done",
        evidence,
        limitationsPreamble,
        rawMarkdown,
      })
    } catch {
      setState({ status: "error", message: t("errorGeneric") })
    }
  }, [question, t])

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <h2 className="font-medium">{t("sectionTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("sectionDescription")}</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label htmlFor="lynx-truth-question" className="text-sm font-medium">
            {t("labelQuestion")}
          </label>
          <Input
            id="lynx-truth-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("placeholderQuestion")}
            disabled={state.status === "loading"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void runSearch()
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={() => void runSearch()}
          disabled={state.status === "loading" || !question.trim()}
        >
          {state.status === "loading" ? t("pending") : t("submit")}
        </Button>
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "done" ? (
        <div className="space-y-6 border-t pt-4">
          <div>
            <h3 className="text-sm font-semibold">{t("headingAnswer")}</h3>
            <div className="mt-2 text-sm whitespace-pre-wrap">
              {parsed?.answer || state.rawMarkdown || "—"}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("headingEvidence")}</h3>
            {state.evidence.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("evidenceEmpty")}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {state.evidence.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{row.title}</span>
                    <span className="ml-2 text-muted-foreground">
                      id={row.id} ·{" "}
                      {t("distanceLabel", {
                        distance: row.distance.toFixed(4),
                      })}
                    </span>
                    <p className="mt-1 line-clamp-4 text-muted-foreground">
                      {row.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("headingLimitations")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.limitationsPreamble}
            </p>
            {parsed?.limitations ? (
              <div className="mt-2 text-sm whitespace-pre-wrap">
                {parsed.limitations}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("headingNextAction")}</h3>
            <div className="mt-2 text-sm whitespace-pre-wrap">
              {parsed?.nextSafeAction || "—"}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
