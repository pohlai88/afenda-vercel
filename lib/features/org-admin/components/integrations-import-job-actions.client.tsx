"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Spinner } from "#components2/ui/spinner"

import {
  cancelOrgImportJob,
  runOrgImportJob,
  type ImportJobActionState,
} from "../actions/import-jobs.actions"
import type { OrgImportJobState } from "../types"

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

export function IntegrationsImportJobActions({
  jobId,
  state,
}: {
  jobId: string
  state: OrgImportJobState
}) {
  const isUploaded = state === "uploaded"
  const isTerminal =
    state === "completed" || state === "cancelled" || state === "failed"

  return (
    <div className="flex min-w-[8rem] flex-wrap items-start gap-2">
      <RunForm jobId={jobId} disabled={!isUploaded} />
      <CancelForm jobId={jobId} disabled={isTerminal} />
    </div>
  )
}
