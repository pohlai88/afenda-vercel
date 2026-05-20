"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import type { SftSwapMutationFormState } from "../../../types"
import {
  approveShiftSwapRequestAction,
  overrideShiftSwapRequestAction,
  rejectShiftSwapRequestAction,
  returnShiftSwapRequestAction,
} from "#features/hrm/client"

export function SftSwapDecisionForms({
  swapRequestId,
}: {
  swapRequestId: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ApproveSwapButton swapRequestId={swapRequestId} />
      <ReturnSwapDialog swapRequestId={swapRequestId} />
      <OverrideSwapDialog swapRequestId={swapRequestId} />
      <RejectSwapDialog swapRequestId={swapRequestId} />
      <span className="sr-only">
        {t("swapDecideFor", { id: swapRequestId })}
      </span>
    </div>
  )
}

function ApproveSwapButton({ swapRequestId }: { swapRequestId: string }) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, action, pending] = useActionState<
    SftSwapMutationFormState | undefined,
    FormData
  >(approveShiftSwapRequestAction, undefined)

  return (
    <form action={action}>
      <input type="hidden" name="swapRequestId" value={swapRequestId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {t("swapApprove")}
      </Button>
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.errors.form}</p>
      ) : null}
    </form>
  )
}

function ReturnSwapDialog({ swapRequestId }: { swapRequestId: string }) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const reasonId = useId()
  const [state, action, pending] = useActionState<
    SftSwapMutationFormState | undefined,
    FormData
  >(returnShiftSwapRequestAction, undefined)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("swapReturn")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("swapReturnTitle")}</DialogTitle>
          <DialogDescription>{t("swapReturnDescription")}</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="swapRequestId" value={swapRequestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>{t("swapReturnReason")}</FieldLabel>
            <Input id={reasonId} name="returnedReason" required minLength={3} />
            {state && !state.ok && state.errors.returnedReason ? (
              <FieldError>{state.errors.returnedReason}</FieldError>
            ) : null}
          </Field>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t("swapReturnConfirm")}
          </Button>
          {state && !state.ok && state.errors.form ? (
            <FieldError>{state.errors.form}</FieldError>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OverrideSwapDialog({ swapRequestId }: { swapRequestId: string }) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const noteId = useId()
  const [state, action, pending] = useActionState<
    SftSwapMutationFormState | undefined,
    FormData
  >(overrideShiftSwapRequestAction, undefined)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("swapOverride")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("swapOverrideTitle")}</DialogTitle>
          <DialogDescription>{t("swapOverrideDescription")}</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="swapRequestId" value={swapRequestId} />
          <Field>
            <FieldLabel htmlFor={noteId}>{t("swapOverrideNote")}</FieldLabel>
            <Input id={noteId} name="overrideNote" required minLength={3} />
            {state && !state.ok && state.errors.overrideNote ? (
              <FieldError>{state.errors.overrideNote}</FieldError>
            ) : null}
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t("swapOverrideConfirm")}
          </Button>
          {state && !state.ok && state.errors.form ? (
            <FieldError>{state.errors.form}</FieldError>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RejectSwapDialog({ swapRequestId }: { swapRequestId: string }) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const reasonId = useId()
  const [state, action, pending] = useActionState<
    SftSwapMutationFormState | undefined,
    FormData
  >(rejectShiftSwapRequestAction, undefined)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("swapReject")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("swapRejectTitle")}</DialogTitle>
          <DialogDescription>{t("swapRejectDescription")}</DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="swapRequestId" value={swapRequestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>{t("swapRejectReason")}</FieldLabel>
            <Input id={reasonId} name="rejectedReason" required minLength={3} />
            {state && !state.ok && state.errors.rejectedReason ? (
              <FieldError>{state.errors.rejectedReason}</FieldError>
            ) : null}
          </Field>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t("swapRejectConfirm")}
          </Button>
          {state && !state.ok && state.errors.form ? (
            <FieldError>{state.errors.form}</FieldError>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
