"use client"

import { useCallback, useId, useState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Label } from "#components2/ui/label"

import {
  hrmImportDryRunSuccessResponseSchema,
  HRM_IMPORT_TYPES,
  parseHrmImportDryRunErrorMessage,
  type HrmImportDryRunSuccessResponse,
} from "../schemas/hrm-import.schema"

import { reportHrmImportClientError } from "./hrm-import-report-error.client"
import { HrmImportSessionCommitRollback } from "./hrm-import-session-commit-rollback.client"

const DRY_RUN_DIAGNOSTIC_PREVIEW_MAX_CHARS = 400

type DryRunResponse =
  | HrmImportDryRunSuccessResponse
  | { ok: false; error: string }

function previewUnknownForDiagnostics(value: unknown): string {
  try {
    const s = JSON.stringify(value)
    return s.length > DRY_RUN_DIAGNOSTIC_PREVIEW_MAX_CHARS
      ? `${s.slice(0, DRY_RUN_DIAGNOSTIC_PREVIEW_MAX_CHARS)}…`
      : s
  } catch {
    return String(value).slice(0, DRY_RUN_DIAGNOSTIC_PREVIEW_MAX_CHARS)
  }
}

type HrmImportWizardProps = {
  orgSlug: string
}

export function HrmImportWizard({ orgSlug }: HrmImportWizardProps) {
  const t = useTranslations("Dashboard.Hrm.imports")
  const importTypeId = useId()
  const fileId = useId()
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<DryRunResponse | null>(null)

  const runDryRun = useCallback(
    async (formData: FormData) => {
      setPending(true)
      setResult(null)
      try {
        const res = await fetch("/api/erp/hrm/import", {
          method: "POST",
          body: formData,
          credentials: "include",
        })
        let raw: unknown
        try {
          raw = await res.json()
        } catch (parseErr) {
          reportHrmImportClientError(
            "Import dry-run: invalid JSON body",
            parseErr
          )
          setResult({ ok: false, error: t("errorGeneric") })
          return
        }

        if (!res.ok) {
          setResult({
            ok: false,
            error: parseHrmImportDryRunErrorMessage(raw, t("errorGeneric")),
          })
          return
        }

        const okBody = hrmImportDryRunSuccessResponseSchema.safeParse(raw)
        if (!okBody.success) {
          reportHrmImportClientError(
            "Import dry-run: 200 response did not match success schema",
            new Error(previewUnknownForDiagnostics(raw))
          )
          setResult({ ok: false, error: t("errorGeneric") })
          return
        }
        setResult(okBody.data)
      } catch (err) {
        reportHrmImportClientError("Import dry-run: request failed", err)
        setResult({ ok: false, error: t("errorGeneric") })
      } finally {
        setPending(false)
      }
    },
    [t]
  )

  const canCommit =
    result?.ok === true && result.errors.length === 0 && result.rowCount > 0

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("wizardTitle")}</CardTitle>
        <CardDescription>{t("wizardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            fd.set("orgSlug", orgSlug)
            await runDryRun(fd)
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor={importTypeId}>{t("fieldImportType")}</Label>
            <select
              id={importTypeId}
              name="importType"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="employees"
            >
              {HRM_IMPORT_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`importTypes.${x}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={fileId}>{t("fieldFile")}</Label>
            <input
              id={fileId}
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="text-sm"
            />
          </div>
          <Button type="submit" disabled={pending} variant="secondary">
            {pending ? t("dryRunPending") : t("dryRunSubmit")}
          </Button>
        </form>

        {result && !result.ok ? (
          <Alert variant="destructive" className="mt-4 py-2">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        ) : null}

        {result && result.ok ? (
          <div className="mt-4 space-y-3 text-sm">
            <p>
              {t("dryRunOk", { count: result.rowCount, id: result.sessionId })}
            </p>
            {result.errors.length > 0 ? (
              <ul className="list-inside list-disc text-destructive">
                {result.errors.map((e, index) => (
                  <li key={`${e.line}-${index}-${e.message}`}>
                    {t("rowError", { line: e.line, message: e.message })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t("dryRunNoRowErrors")}</p>
            )}

            <HrmImportSessionCommitRollback
              key={result.sessionId}
              orgSlug={orgSlug}
              sessionId={result.sessionId}
              canCommit={canCommit}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
