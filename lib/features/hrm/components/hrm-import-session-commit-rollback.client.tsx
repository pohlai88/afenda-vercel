"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"

import {
  commitImportSessionAction,
  rollbackImportSessionAction,
} from "../actions/hrm-import.actions"

import { HrmImportFormSubmitButton } from "./hrm-import-form-submit-button.client"
import { useHrmImportRouterRefreshOnce } from "./hrm-import-use-router-refresh-once.client"

type HrmImportSessionCommitRollbackProps = {
  orgSlug: string
  sessionId: string
  canCommit: boolean
}

export function HrmImportSessionCommitRollback({
  orgSlug,
  sessionId,
  canCommit,
}: HrmImportSessionCommitRollbackProps) {
  const t = useTranslations("Dashboard.Hrm.imports")
  const [commitState, commitAction] = useActionState(
    commitImportSessionAction,
    undefined
  )
  const [rollbackState, rollbackAction] = useActionState(
    rollbackImportSessionAction,
    undefined
  )

  useHrmImportRouterRefreshOnce(commitState?.ok)
  useHrmImportRouterRefreshOnce(rollbackState?.ok)

  return (
    <div className="space-y-3">
      {!canCommit ? (
        <p className="text-muted-foreground">{t("commitBlockedHint")}</p>
      ) : null}

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

      {canCommit && !commitState?.ok ? (
        <form action={commitAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="importSessionId" value={sessionId} />
          <HrmImportFormSubmitButton label={t("commitSubmit")} />
        </form>
      ) : null}

      {commitState?.ok ? (
        <>
          {rollbackState && !rollbackState.ok ? (
            <Alert variant="destructive" className="py-2">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{rollbackState.errors?.form}</AlertDescription>
            </Alert>
          ) : null}
          {!rollbackState?.ok ? (
            <form action={rollbackAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <input type="hidden" name="importSessionId" value={sessionId} />
              <HrmImportFormSubmitButton
                label={t("rollbackSubmit")}
                variant="destructive"
              />
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
