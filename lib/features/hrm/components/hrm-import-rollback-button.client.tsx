"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"

import { rollbackImportSessionAction } from "../actions/hrm-import.actions"

function RollbackSubmitBtn() {
  const { pending } = useFormStatus()
  const t = useTranslations("Dashboard.Hrm.imports")
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {t("rollbackSubmit")}
    </Button>
  )
}

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
        <RollbackSubmitBtn />
      </form>
    </div>
  )
}
