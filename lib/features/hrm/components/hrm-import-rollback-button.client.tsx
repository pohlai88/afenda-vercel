"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription } from "#components/ui/alert"

import { rollbackImportSessionAction } from "../actions/hrm-import.actions"

import { HrmImportFormSubmitButton } from "./hrm-import-form-submit-button.client"
import { useHrmImportRouterRefreshOnce } from "./hrm-import-use-router-refresh-once.client"

type HrmImportRollbackButtonProps = {
  orgSlug: string
  sessionId: string
}

export function HrmImportRollbackButton({
  orgSlug,
  sessionId,
}: HrmImportRollbackButtonProps) {
  const t = useTranslations("Dashboard.Hrm.imports")
  const [state, action] = useActionState(rollbackImportSessionAction, undefined)

  useHrmImportRouterRefreshOnce(state?.ok)

  if (state?.ok) {
    return (
      <Alert className="py-1 text-xs">
        <AlertDescription>{t("rollbackOk")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.errors?.form}</p>
      ) : null}
      <form action={action}>
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="importSessionId" value={sessionId} />
        <HrmImportFormSubmitButton
          label={t("rollbackSubmit")}
          variant="destructive"
        />
      </form>
    </div>
  )
}
