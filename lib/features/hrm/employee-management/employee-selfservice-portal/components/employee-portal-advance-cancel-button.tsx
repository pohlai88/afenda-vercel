"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { submitEmployeePortalCancelPendingAdvance } from "#features/hrm/client"
import type { PortalAdvanceFormState } from "#features/hrm/types"

type EmployeePortalAdvanceCancelButtonProps = {
  portalSlug: string
  advanceId: string
}

export function EmployeePortalAdvanceCancelButton({
  portalSlug,
  advanceId,
}: EmployeePortalAdvanceCancelButtonProps) {
  const t = useTranslations("Dashboard.Hrm.portalAdvances")
  const [state, formAction, pending] = useActionState<
    PortalAdvanceFormState | undefined,
    FormData
  >(submitEmployeePortalCancelPendingAdvance, undefined)

  return (
    <div className="flex flex-col items-end gap-1">
      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive" className="w-auto max-w-xs py-2">
          <AlertDescription className="text-xs">
            {state.errors.form}
          </AlertDescription>
        </Alert>
      ) : null}
      <form action={formAction}>
        <input type="hidden" name="portalSlug" value={portalSlug} />
        <input type="hidden" name="advanceId" value={advanceId} />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            t("cancelPending")
          )}
        </Button>
      </form>
    </div>
  )
}
