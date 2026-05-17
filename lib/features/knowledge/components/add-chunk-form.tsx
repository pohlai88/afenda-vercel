"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Textarea } from "#components2/ui/textarea"

import { ingestKnowledgeChunk } from "../actions/ingest-chunk"

export function AddKnowledgeChunkForm() {
  const t = useTranslations("Dashboard.Knowledge")
  const [state, formAction, pending] = useActionState(
    ingestKnowledgeChunk,
    undefined
  )

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="w-full">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert className="w-full">
          <AlertTitle>{t("savedTitle")}</AlertTitle>
          <AlertDescription>{t("savedDescription")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="knowledge-title">{t("labelTitle")}</Label>
        <Input
          id="knowledge-title"
          name="title"
          required
          placeholder={t("placeholderTitle")}
          aria-invalid={state && !state.ok && !!state.errors.title}
        />
        {state && !state.ok && state.errors.title ? (
          <p className="text-xs text-destructive" role="alert">
            {state.errors.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="knowledge-body">{t("labelBody")}</Label>
        <Textarea
          id="knowledge-body"
          name="body"
          required
          rows={5}
          placeholder={t("placeholderBody")}
          aria-invalid={state && !state.ok && !!state.errors.body}
        />
        {state && !state.ok && state.errors.body ? (
          <p className="text-xs text-destructive" role="alert">
            {state.errors.body}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("submitPending") : t("submitSave")}
      </Button>
    </form>
  )
}
