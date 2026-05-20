"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"

import {
  seedDefaultOtmTypesAction,
  type SeedOtmTypesFormState,
} from "#features/hrm/client"

export function OtmSeedTypesButton() {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const [state, formAction, pending] = useActionState<
    SeedOtmTypesFormState | undefined,
    FormData
  >(seedDefaultOtmTypesAction, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("seedTypesSubmitting")}
          </>
        ) : (
          t("seedTypes")
        )}
      </Button>
      {state?.ok ? (
        <Alert>
          <AlertTitle>{t("seedTypesSuccessTitle")}</AlertTitle>
          <AlertDescription>
            {t("seedTypesSuccessBody", {
              seeded: state.seeded.length,
              skipped: state.skipped.length,
            })}
          </AlertDescription>
        </Alert>
      ) : null}
      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
