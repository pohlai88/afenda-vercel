"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"

import { completeOnboardingStepAction } from "#features/hrm/client"

type HrmOnboardingStepFormProps = {
  orgSlug: string
  contractId: string
}

export function HrmOnboardingStepForm({
  orgSlug,
  contractId,
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
        disabled={pending}
        aria-invalid={Boolean(state && !state.ok && state.errors.form)}
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
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
