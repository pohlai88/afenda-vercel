"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"

import {
  markOtmPayrollReadyAction,
  type MarkOtmPayrollReadyFormState,
} from "#features/hrm/client"

export function OtmMarkPayrollReadyButton({ requestId }: { requestId: string }) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const [state, formAction, pending] = useActionState<
    MarkOtmPayrollReadyFormState | undefined,
    FormData
  >(markOtmPayrollReadyAction, undefined)

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("markPayrollReadySubmitting")}
          </>
        ) : (
          t("markPayrollReady")
        )}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <span className="sr-only">{state.errors.form}</span>
      ) : null}
    </form>
  )
}
