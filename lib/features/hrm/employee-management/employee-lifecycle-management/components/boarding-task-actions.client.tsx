"use client"

import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components/ui/dialog"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"

import {
  completeBoardingTaskAction,
  startBoardingTaskAction,
  waiveBoardingTaskAction,
} from "#features/hrm/client"

import type { ContractMutationFormState } from "../../../types"

type BoardingTaskActionsProps = {
  readonly orgSlug: string
  readonly taskId: string
  readonly status: string
}

export function BoardingTaskActions({
  orgSlug,
  taskId,
  status,
}: BoardingTaskActionsProps) {
  if (status === "completed" || status === "waived" || status === "cancelled") {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" ? (
        <BoardingTaskStartForm orgSlug={orgSlug} taskId={taskId} />
      ) : null}
      {status === "pending" || status === "in_progress" || status === "blocked" ? (
        <>
          <BoardingTaskCompleteForm orgSlug={orgSlug} taskId={taskId} />
          <BoardingTaskWaiveForm orgSlug={orgSlug} taskId={taskId} />
        </>
      ) : null}
    </div>
  )
}

function BoardingTaskStartForm({
  orgSlug,
  taskId,
}: {
  orgSlug: string
  taskId: string
}) {
  const t = useTranslations("Dashboard.Hrm.boarding")
  const [state, formAction, pending] = useActionState(
    startBoardingTaskAction,
    undefined
  )

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : t("taskStart")}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <span className="sr-only">{state.errors.form}</span>
      ) : null}
    </form>
  )
}

function BoardingTaskCompleteForm({
  orgSlug,
  taskId,
}: {
  orgSlug: string
  taskId: string
}) {
  const t = useTranslations("Dashboard.Hrm.boarding")
  const [state, formAction, pending] = useActionState(
    completeBoardingTaskAction,
    undefined
  )

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          t("taskComplete")
        )}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <span className="sr-only">{state.errors.form}</span>
      ) : null}
    </form>
  )
}

function BoardingTaskWaiveForm({
  orgSlug,
  taskId,
}: {
  orgSlug: string
  taskId: string
}) {
  const t = useTranslations("Dashboard.Hrm.boarding")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    ContractMutationFormState | undefined,
    FormData
  >(waiveBoardingTaskAction, undefined)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost">
          {t("taskWaive")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("taskWaiveTitle")}</DialogTitle>
          <DialogDescription>{t("taskWaiveDescription")}</DialogDescription>
        </DialogHeader>
        {state?.ok ? (
          <div className="flex flex-col gap-4">
            <Alert>
              <AlertTitle>{t("taskWaiveSuccess")}</AlertTitle>
            </Alert>
            <Button type="button" onClick={() => setOpen(false)}>
              {t("dialogClose")}
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="taskId" value={taskId} />
            {state && !state.ok && state.errors.form ? (
              <Alert variant="destructive">
                <AlertTitle>{t("errorTitle")}</AlertTitle>
                <AlertDescription>{state.errors.form}</AlertDescription>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor={`waive-${taskId}`}>
                {t("fieldWaiverReason")}
              </FieldLabel>
              <Input
                id={`waive-${taskId}`}
                name="waiverReason"
                required
                autoComplete="off"
              />
              {state && !state.ok && state.errors.form ? (
                <FieldError>{state.errors.form}</FieldError>
              ) : null}
            </Field>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("taskWaiving")}
                </>
              ) : (
                t("taskWaiveSubmit")
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
