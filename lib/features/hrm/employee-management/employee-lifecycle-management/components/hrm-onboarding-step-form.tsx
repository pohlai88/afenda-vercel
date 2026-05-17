"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"

import { completeOnboardingStepAction } from "#features/hrm/client"

type HrmOnboardingStepFormProps = {
  orgSlug: string
  contractId: string
  disabled?: boolean
}

export function HrmOnboardingStepForm({
  orgSlug,
  contractId,
  disabled = false,
}: HrmOnboardingStepFormProps) {
  const t = useTranslations("Dashboard.Hrm.onboarding")
  const baseId = useId()
  const [state, formAction, pending] = useActionState(
    completeOnboardingStepAction,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="contractId" value={contractId} />

      {state && !state.ok && state.errors.form ? (
        <div className="basis-full">
          <Alert variant="destructive" className="py-2">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{state.errors.form}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <Input
        id={`${baseId}-step`}
        name="stepKey"
        placeholder={t("stepPlaceholder")}
        className="max-w-[180px]"
        autoComplete="off"
        required
        disabled={pending || disabled}
        aria-invalid={Boolean(state && !state.ok && state.errors.form)}
      />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={pending || disabled}
      >
        {pending ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            {t("saving")}
          </>
        ) : (
          t("recordStep")
        )}
      </Button>
    </form>
  )
}
