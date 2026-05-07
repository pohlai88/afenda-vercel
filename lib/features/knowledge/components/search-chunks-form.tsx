"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

import { searchSimilarKnowledgeChunks } from "../actions/search-similar-chunks"

export function SearchKnowledgeChunksForm() {
  const t = useTranslations("Dashboard.Knowledge")
  const [state, formAction, pending] = useActionState(
    searchSimilarKnowledgeChunks,
    undefined
  )

  return (
    <div className="space-y-4">
      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="w-full">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <form
        action={formAction}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="grid min-w-0 flex-1 gap-2">
          <Label htmlFor="knowledge-search-query">{t("labelSearch")}</Label>
          <Input
            id="knowledge-search-query"
            name="query"
            placeholder={t("placeholderSearch")}
            aria-invalid={state && !state.ok && !!state.errors.query}
          />
          {state && !state.ok && state.errors.query ? (
            <p className="text-xs text-destructive" role="alert">
              {state.errors.query}
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? t("searchPending") : t("searchSubmit")}
        </Button>
      </form>

      {state?.ok && state.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("searchEmpty")}</p>
      ) : null}

      {state?.ok && state.rows.length > 0 ? (
        <ul className="space-y-3 rounded-xl border bg-muted/30 p-4">
          {state.rows.map((row) => (
            <li
              key={row.id}
              className="space-y-1 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{row.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("distanceLabel", {
                    distance: row.distance.toFixed(4),
                  })}
                </span>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {row.body}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
