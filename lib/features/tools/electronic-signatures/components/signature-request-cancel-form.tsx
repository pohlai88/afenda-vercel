"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"

import { cancelSignatureRequestAction } from "../actions/signature-request.actions"

type SignatureRequestCancelFormProps = {
  orgSlug: string
  requestId: string
}

export function SignatureRequestCancelForm({
  orgSlug,
  requestId,
}: SignatureRequestCancelFormProps) {
  const t = useTranslations("Dashboard.Hrm.signatures")
  const [state, action, pending] = useActionState(
    cancelSignatureRequestAction,
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="requestId" value={requestId} />
      <Input name="reason" placeholder={t("cancelReasonPlaceholder")} />
      {state && !state.ok ? (
        <p className="text-sm text-destructive">{state.errors.form}</p>
      ) : null}
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {t("cancelAction")}
      </Button>
    </form>
  )
}
