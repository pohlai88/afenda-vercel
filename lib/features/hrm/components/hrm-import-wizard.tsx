"use client"

import { useActionState, useCallback, useId, useState } from "react"
import { useFormStatus } from "react-dom"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Label } from "#components/ui/label"

import {
  commitImportSessionAction,
  rollbackImportSessionAction,
} from "../actions/hrm-import.actions"
import { HRM_IMPORT_TYPES } from "../schemas/hrm-import.schema"

type DryRunResponse =
  | {
      ok: true
      sessionId: string
      rowCount: number
      errors: { line: number; message: string }[]
    }
  | { ok: false; error: string }

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} size="sm">
      {label}
    </Button>
  )
}

type HrmImportWizardProps = {
  orgSlug: string
}

export function HrmImportWizard({ orgSlug }: HrmImportWizardProps) {
  const t = useTranslations("Dashboard.Hrm.imports")
  const fileId = useId()
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<DryRunResponse | null>(null)
  const [commitState, commitAction] = useActionState(
    commitImportSessionAction,
    undefined
  )
  const [rollbackState, rollbackAction] = useActionState(
    rollbackImportSessionAction,
    undefined
  )

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
        const data = (await res.json()) as DryRunResponse | { error?: string }
        if (!res.ok) {
          const msg =
            "error" in data && typeof data.error === "string"
              ? data.error
              : t("errorGeneric")
          setResult({ ok: false, error: msg })
          return
        }
        if (!("ok" in data) || !data.ok) {
          setResult({ ok: false, error: t("errorGeneric") })
          return
        }
        setResult(data)
      } catch {
        setResult({ ok: false, error: t("errorGeneric") })
      } finally {
        setPending(false)
      }
    },
    [t]
  )

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
            <Label htmlFor={fileId}>{t("fieldImportType")}</Label>
            <select
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
                {result.errors.map((e) => (
                  <li key={`${e.line}-${e.message}`}>
                    {t("rowError", { line: e.line, message: e.message })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t("dryRunNoRowErrors")}</p>
            )}

            {commitState && !commitState.ok ? (
              <Alert variant="destructive" className="py-2">
                <AlertTitle>{t("errorTitle")}</AlertTitle>
                <AlertDescription>{commitState.errors?.form}</AlertDescription>
              </Alert>
            ) : null}
            {commitState?.ok ? (
              <Alert className="py-2">
                <AlertDescription>{t("commitOk")}</AlertDescription>
              </Alert>
            ) : null}

            {!commitState?.ok ? (
              <form action={commitAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input
                  type="hidden"
                  name="importSessionId"
                  value={result.sessionId}
                />
                <SubmitBtn label={t("commitSubmit")} />
              </form>
            ) : null}

            {commitState?.ok ? (
              <>
                {rollbackState && !rollbackState.ok ? (
                  <Alert variant="destructive" className="py-2">
                    <AlertTitle>{t("errorTitle")}</AlertTitle>
                    <AlertDescription>
                      {rollbackState.errors?.form}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {!rollbackState?.ok ? (
                  <form action={rollbackAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="orgSlug" value={orgSlug} />
                    <input
                      type="hidden"
                      name="importSessionId"
                      value={result.sessionId}
                    />
                    <SubmitBtn label={t("rollbackSubmit")} />
                  </form>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
