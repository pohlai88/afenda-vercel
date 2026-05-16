"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  submitEmployeePortalCancelPendingEnrollment,
  type BenefitEnrollmentTransitionFormState,
} from "#features/hrm/client"

type EmployeePortalBenefitCancelButtonProps = {
  portalSlug: string
  enrollmentId: string
}

export function EmployeePortalBenefitCancelButton({
  portalSlug,
  enrollmentId,
}: EmployeePortalBenefitCancelButtonProps) {
  const t = useTranslations("Dashboard.Hrm.portalBenefits")
  const [state, formAction, pending] = useActionState<
    BenefitEnrollmentTransitionFormState | undefined,
    FormData
  >(submitEmployeePortalCancelPendingEnrollment, undefined)

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
        <input type="hidden" name="enrollmentId" value={enrollmentId} />
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
