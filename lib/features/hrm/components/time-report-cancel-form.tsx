"use client"

import { useActionState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { DialogFooter } from "#components/ui/dialog"

import {
  cancelTimeReportAction,
  type CancelTimeReportFormState,
} from "#features/hrm/client"

type TimeReportCancelFormProps = {
  reportId: string
  onSuccess?: () => void
}

export function TimeReportCancelForm({
  reportId,
  onSuccess,
}: TimeReportCancelFormProps) {
  const t = useTranslations("Dashboard.Hrm.leave.timeReports")
  const [state, formAction, pending] = useActionState<
    CancelTimeReportFormState | undefined,
    FormData
  >(cancelTimeReportAction, undefined)

  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])

  const error = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="reportId" value={reportId} />

      {error?.form || error?.reportId ? (
        <Alert variant="destructive">
          <AlertDescription>{error.form ?? error.reportId}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter showCloseButton>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
                aria-hidden
              />
              {t("cancelling")}
            </>
          ) : (
            t("cancelReport")
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
