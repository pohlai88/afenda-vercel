"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { DialogFooter } from "#components2/ui/dialog"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"

import {
  cancelLeaveAction,
  type CancelLeaveFormState,
} from "#features/hrm/client"

type LeaveCancelFormProps = {
  requestId: string
  onSuccess?: () => void
}

/**
 * Cancel-leave form body. Lives outside the dialog wrapper so the
 * `onSuccess` callback (parent dialog close) reads as a normal function
 * to ESLint, mirroring the other leave dialogs.
 */
export function LeaveCancelForm({
  requestId,
  onSuccess,
}: LeaveCancelFormProps) {
  const t = useTranslations("Dashboard.Hrm.leave")
  const [state, formAction, pending] = useActionState<
    CancelLeaveFormState | undefined,
    FormData
  >(cancelLeaveAction, undefined)
  useFormSuccess(state, onSuccess)

  const error = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="requestId" value={requestId} />

      {error?.form || error?.requestId ? (
        <Alert variant="destructive">
          <AlertDescription>{error.form ?? error.requestId}</AlertDescription>
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
            t("cancelRequest")
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
