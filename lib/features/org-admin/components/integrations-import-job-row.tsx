"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"

import {
  cancelOrgImportJob,
  runOrgImportJob,
  type ImportJobActionState,
} from "../actions/import-jobs.actions"
import type { OrgImportJobFailureSummary, OrgImportJobSummary } from "../types"

function SubmitButton({
  label,
  pendingLabel,
  variant = "outline",
  disabled = false,
}: {
  label: string
  pendingLabel: string
  variant?: "default" | "outline" | "destructive" | "secondary"
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      disabled={pending || disabled}
    >
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

function RunForm({ jobId, disabled }: { jobId: string; disabled: boolean }) {
  const t = useTranslations("OrgAdmin.integrations.imports")
  const [state, action] = useActionState<ImportJobActionState, FormData>(
    runOrgImportJob,
    null
  )
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="jobId" value={jobId} />
      <SubmitButton
        label={t("run")}
        pendingLabel={t("running")}
        disabled={disabled}
      />
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

function CancelForm({ jobId, disabled }: { jobId: string; disabled: boolean }) {
  const t = useTranslations("OrgAdmin.integrations.imports")
  const [state, action] = useActionState<ImportJobActionState, FormData>(
    cancelOrgImportJob,
    null
  )
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="jobId" value={jobId} />
      <SubmitButton
        label={t("cancel")}
        pendingLabel={t("cancelling")}
        variant="destructive"
        disabled={disabled}
      />
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

export function IntegrationsImportJobRow({
  job,
  recentFailures,
}: {
  job: OrgImportJobSummary
  recentFailures: readonly OrgImportJobFailureSummary[]
}) {
  const t = useTranslations("OrgAdmin.integrations.imports")
  const isUploaded = job.state === "uploaded"
  const isTerminal =
    job.state === "completed" ||
    job.state === "cancelled" ||
    job.state === "failed"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <p className="font-medium">
            {t(`adapter.${job.adapter}`)}{" "}
            <span className="text-muted-foreground">
              · {job.createdAt.toISOString().slice(0, 19)}Z
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t("rowSummary", {
              total: job.totalRows,
              applied: job.successCount,
              failed: job.failureCount,
              state: job.state,
            })}
          </p>
          {job.metadata && typeof job.metadata.filename === "string" ? (
            <p className="font-mono text-xs text-muted-foreground">
              {job.metadata.filename}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <RunForm jobId={job.id} disabled={!isUploaded} />
          <CancelForm jobId={job.id} disabled={isTerminal} />
        </div>
      </div>

      {recentFailures.length > 0 ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("recentFailuresTitle")}
          </p>
          <ul className="space-y-1 text-xs">
            {recentFailures.map((failure) => (
              <li
                key={failure.id}
                className="flex flex-wrap items-center gap-x-2 font-mono"
              >
                <span className="text-muted-foreground">
                  {failure.createdAt.toISOString().slice(0, 19)}Z
                </span>
                <span className="text-destructive">{failure.code}</span>
                <span>{failure.message}</span>
                {failure.field ? (
                  <span className="text-muted-foreground">
                    [{failure.field}]
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
