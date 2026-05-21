"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, SparklesIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"

import {
  seedMalaysiaEa2023LeaveTypesAction,
  type SeedLeaveTypesFormState,
} from "#features/hrm/client"

/**
 * Seed Malaysia EA 2023 default leave types (idempotent). The action
 * skips rows whose code already exists, so re-running this is safe;
 * the result summary distinguishes between newly inserted and skipped
 * codes so an admin always knows what the click did.
 *
 * The dialog stays open after a successful seed so the operator can
 * read the per-row summary; the trigger is intentionally a thin
 * "ghost"-styled CTA next to the create button so it doesn't compete
 * for attention.
 */
export function PoliciesSeedMyEa2023Dialog() {
  const t = useTranslations("Dashboard.Hrm.policies")
  const [open, setOpen] = useState(false)
  const [dialogGeneration, setDialogGeneration] = useState(0)
  const [state, formAction, pending] = useActionState<
    SeedLeaveTypesFormState | undefined,
    FormData
  >(seedMalaysiaEa2023LeaveTypesAction, undefined)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !open) {
      setDialogGeneration((generation) => generation + 1)
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <SparklesIcon data-icon="inline-start" aria-hidden />
          {t("leaveTypes.seed")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("leaveTypes.seedDialogTitle")}</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{t("leaveTypes.seedDialogDescription")}</p>
            <p className="text-xs text-muted-foreground">
              {t("leaveTypes.seedDialogPayrollHint")}
            </p>
          </DialogDescription>
        </DialogHeader>

        {state?.ok ? (
          <Alert variant="default">
            <AlertTitle>
              {state.seeded.length === 0
                ? t("leaveTypes.seedSummaryEmpty")
                : t("leaveTypes.seedSummarySuccess", {
                    seeded: state.seeded.length,
                  })}
            </AlertTitle>
            {state.skipped.length > 0 ? (
              <AlertDescription>
                {t("leaveTypes.seedSummarySkipped", {
                  skipped: state.skipped.length,
                })}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  ({state.skipped.join(", ")})
                </span>
              </AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        {state && !state.ok ? (
          <Alert variant="destructive">
            <AlertTitle>{t("leaveTypes.seedFailed")}</AlertTitle>
            <AlertDescription>{state.errors.form}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <form key={dialogGeneration} action={formAction}>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t("leaveTypes.seedSubmitting")}
                </>
              ) : (
                t("leaveTypes.seedSubmit")
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
