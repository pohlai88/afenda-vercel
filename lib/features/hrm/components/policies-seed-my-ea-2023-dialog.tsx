"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, SparklesIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog"

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
  const [state, formAction, pending] = useActionState<
    SeedLeaveTypesFormState | undefined,
    FormData
  >(seedMalaysiaEa2023LeaveTypesAction, undefined)

  // Reset transient state when the dialog is reopened so a previous
  // run's summary doesn't bleed into the new attempt.
  const lastOpenRef = useRef(open)
  useEffect(() => {
    lastOpenRef.current = open
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <SparklesIcon data-icon="inline-start" aria-hidden />
          {t("leaveTypes.seed")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("leaveTypes.seedDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("leaveTypes.seedDialogDescription")}
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
                <span className="text-muted-foreground font-mono text-xs">
                  ({state.skipped.join(", ")})
                </span>
              </AlertDescription>
            ) : null}
          </Alert>
        ) : null}

        {state && !state.ok ? (
          <Alert variant="destructive">
            <AlertTitle>{t("leaveTypes.seedFailed")}</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <form action={formAction}>
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
