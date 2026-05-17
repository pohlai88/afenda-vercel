"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Spinner } from "#components2/ui/spinner"
import { Textarea } from "#components2/ui/textarea"

import {
  createOrgImportJob,
  type ImportJobActionState,
} from "../actions/import-jobs.actions"
import { IMPORT_ADAPTERS } from "../constants"

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="size-3.5" />
          {pendingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  )
}

export function IntegrationsImportJobForm() {
  const t = useTranslations("OrgAdmin.integrations.imports")
  const [adapter, setAdapter] = useState<string>(IMPORT_ADAPTERS[0])
  const [state, formAction] = useActionState<ImportJobActionState, FormData>(
    createOrgImportJob,
    null
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="adapter" value={adapter} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="import-adapter">{t("formAdapterLabel")}</Label>
          <select
            id="import-adapter"
            value={adapter}
            onChange={(e) => setAdapter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
          >
            {IMPORT_ADAPTERS.map((id) => (
              <option key={id} value={id}>
                {t(`adapter.${id}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="import-filename">{t("formFilenameLabel")}</Label>
          <Input
            id="import-filename"
            name="filename"
            type="text"
            autoComplete="off"
            placeholder="invites-2026-q2.csv"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="import-csv">{t("formCsvLabel")}</Label>
        <Textarea
          id="import-csv"
          name="csvText"
          rows={8}
          required
          placeholder={t("formCsvPlaceholder")}
          className="font-mono text-xs"
        />
        {state && !state.ok && state.fieldErrors?.csvText ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.csvText}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton
          label={t("formSubmit")}
          pendingLabel={t("formSubmitting")}
        />
      </div>

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertTitle>{t("formErrorTitle")}</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state && state.ok ? (
        <Alert>
          <AlertTitle>{t("formSuccessTitle")}</AlertTitle>
          <AlertDescription>
            {t("formSuccessDescription", {
              total: state.job.totalRows,
              failures: state.job.failureCount,
            })}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
