"use client"

import { useCallback, useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"

import {
  LYNX_ERP_HTTP_ROUTES,
  type LynxOperatorNdjsonMeta,
} from "#features/lynx/client"

function parseOperatorMetaTools(
  tools: string[] | undefined
): LynxOperatorNdjsonMeta["tools"] | undefined {
  if (!tools?.length) return undefined
  return tools as LynxOperatorNdjsonMeta["tools"]
}

type StreamState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "done"
      meta: LynxOperatorNdjsonMeta
      rawMarkdown: string
    }
  | { status: "error"; message: string }

export function OperatorAssistClient() {
  const t = useTranslations("Dashboard.Lynx.operator")
  const [message, setMessage] = useState("")
  const [state, setState] = useState<StreamState>({ status: "idle" })

  const run = useCallback(async () => {
    const q = message.trim()
    if (!q) return

    setState({ status: "loading" })
    try {
      const res = await fetch(LYNX_ERP_HTTP_ROUTES.operator, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      })

      if (!res.ok) {
        let errMsg = t("errorGeneric")
        try {
          const data = (await res.json()) as { error?: string }
          if (data.error) errMsg = data.error
        } catch {
          /* ignore */
        }
        setState({ status: "error", message: errMsg })
        return
      }

      if (!res.body) {
        setState({ status: "error", message: t("errorStream") })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let meta: LynxOperatorNdjsonMeta | null = null
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
              delta?: string
              message?: string
              layer?: string
              tools?: string[]
            }
            const tools = parseOperatorMetaTools(obj.tools)
            if (obj.type === "meta" && obj.layer === "operator" && tools) {
              meta = {
                type: "meta",
                layer: "operator",
                tools,
              }
              continue
            }
            if (obj.type === "delta" && typeof obj.delta === "string") {
              rawMarkdown += obj.delta
              continue
            }
            if (obj.type === "error" && typeof obj.message === "string") {
              setState({ status: "error", message: obj.message })
              return
            }
          } catch {
            setState({ status: "error", message: t("errorStream") })
            return
          }
        }
      }

      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer) as {
            type?: string
            delta?: string
            layer?: string
            tools?: string[]
          }
          const tools = parseOperatorMetaTools(obj.tools)
          if (obj.type === "meta" && obj.layer === "operator" && tools) {
            meta = {
              type: "meta",
              layer: "operator",
              tools,
            }
          } else if (obj.type === "delta" && typeof obj.delta === "string") {
            rawMarkdown += obj.delta
          }
        } catch {
          /* trailing incomplete line */
        }
      }

      if (!meta) {
        setState({ status: "error", message: t("errorStream") })
        return
      }

      setState({
        status: "done",
        meta,
        rawMarkdown,
      })
    } catch {
      setState({ status: "error", message: t("errorGeneric") })
    }
  }, [message, t])

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="font-medium">{t("sectionTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("sectionDescription")}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <label
            className="text-sm font-medium"
            htmlFor="lynx-operator-message"
          >
            {t("labelMessage")}
          </label>
          <Input
            id="lynx-operator-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("placeholderMessage")}
            disabled={state.status === "loading"}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void run()
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={() => void run()}
          disabled={state.status === "loading" || !message.trim()}
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
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("toolsLabel")}: {state.meta.tools.join(", ")}
          </p>
          <div className="rounded-xl border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
            {state.rawMarkdown || "—"}
          </div>
        </div>
      ) : null}
    </section>
  )
}
