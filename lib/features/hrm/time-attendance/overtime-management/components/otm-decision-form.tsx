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

import type { OtmApprovalFormState } from "../../../types"
import {
  adjustOtmRequestAction,
  approveOtmRequestAction,
  rejectOtmRequestAction,
  returnOtmRequestAction,
} from "../actions/otm-approval.actions"

import type { OtmApprovalStage } from "../data/otm-approval-snapshot.shared"

type OtmDecisionFormsProps = {
  requestId: string
  timeRange: string
  workDate: string
  startTime: string
  endTime: string
  approvalStage?: OtmApprovalStage | null
}

export function OtmDecisionForms({
  requestId,
  timeRange,
  workDate,
  startTime,
  endTime,
  approvalStage = null,
}: OtmDecisionFormsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ApproveOtmButton
        requestId={requestId}
        timeRange={timeRange}
        approvalStage={approvalStage}
      />
      <AdjustOtmDialog
        requestId={requestId}
        timeRange={timeRange}
        workDate={workDate}
        startTime={startTime}
        endTime={endTime}
      />
      <ReturnOtmDialog requestId={requestId} timeRange={timeRange} />
      <RejectOtmDialog requestId={requestId} timeRange={timeRange} />
    </div>
  )
}

function AdjustOtmDialog({
  requestId,
  timeRange,
  workDate,
  startTime,
  endTime,
}: {
  requestId: string
  timeRange: string
  workDate: string
  startTime: string
  endTime: string
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const workDateId = useId()
  const startTimeId = useId()
  const endTimeId = useId()
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    OtmApprovalFormState | undefined,
    FormData
  >(adjustOtmRequestAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="secondary">
          {t("adjust")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("adjustDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("adjustDialogDescription", { timeRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={workDateId}>{t("fieldWorkDate")}</FieldLabel>
            <Input
              id={workDateId}
              name="workDate"
              type="date"
              defaultValue={workDate}
              required
            />
            {errors?.workDate ? (
              <FieldError>{errors.workDate}</FieldError>
            ) : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={startTimeId}>{t("fieldStartTime")}</FieldLabel>
              <Input
                id={startTimeId}
                name="startTime"
                type="time"
                defaultValue={startTime}
                required
                step={60}
              />
              {errors?.startTime ? (
                <FieldError>{errors.startTime}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor={endTimeId}>{t("fieldEndTime")}</FieldLabel>
              <Input
                id={endTimeId}
                name="endTime"
                type="time"
                defaultValue={endTime}
                required
                step={60}
              />
              {errors?.endTime ? (
                <FieldError>{errors.endTime}</FieldError>
              ) : null}
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor={reasonId}>
              {t("fieldAdjustmentReason")}
            </FieldLabel>
            <Input id={reasonId} name="adjustmentReason" required />
            {errors?.adjustmentReason ? (
              <FieldError>{errors.adjustmentReason}</FieldError>
            ) : null}
          </Field>
          {errors?.form ? (
            <p className="text-sm text-destructive">{errors.form}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? t("adjusting") : t("confirmAdjust")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ApproveOtmButton({
  requestId,
  timeRange,
  approvalStage,
}: {
  requestId: string
  timeRange: string
  approvalStage: OtmApprovalStage | null
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const isManagerStage = approvalStage === "manager"
  const approveLabel = isManagerStage ? t("advanceToHr") : t("approve")
  const approvingLabel = isManagerStage ? t("advancingToHr") : t("approving")
  const approveAriaLabel = isManagerStage
    ? t("advanceToHrAria", { timeRange })
    : t("approveAria", { timeRange })
  const [state, formAction, pending] = useActionState<
    OtmApprovalFormState | undefined,
    FormData
  >(approveOtmRequestAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      aria-label={approveAriaLabel}
    >
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {approvingLabel}
          </>
        ) : (
          approveLabel
        )}
      </Button>
      {error?.form ? (
        <span className="text-xs text-destructive">{error.form}</span>
      ) : null}
    </form>
  )
}

function ReturnOtmDialog({
  requestId,
  timeRange,
}: {
  requestId: string
  timeRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    OtmApprovalFormState | undefined,
    FormData
  >(returnOtmRequestAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost">
          {t("return")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("returnDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("returnDialogDescription", { timeRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>{t("fieldReturnReason")}</FieldLabel>
            <Input id={reasonId} name="returnedReason" required />
            {errors?.returnedReason ? (
              <FieldError>{errors.returnedReason}</FieldError>
            ) : null}
          </Field>
          {errors?.form ? (
            <p className="text-sm text-destructive">{errors.form}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? t("returning") : t("confirmReturn")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RejectOtmDialog({
  requestId,
  timeRange,
}: {
  requestId: string
  timeRange: string
}) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const reasonId = useId()
  const [state, formAction, pending] = useActionState<
    OtmApprovalFormState | undefined,
    FormData
  >(rejectOtmRequestAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive">
          {t("reject")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rejectDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("rejectDialogDescription", { timeRange })}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field>
            <FieldLabel htmlFor={reasonId}>
              {t("fieldRejectReason")}
            </FieldLabel>
            <Input id={reasonId} name="rejectedReason" required />
            {errors?.rejectedReason ? (
              <FieldError>{errors.rejectedReason}</FieldError>
            ) : null}
          </Field>
          {errors?.form ? (
            <p className="text-sm text-destructive">{errors.form}</p>
          ) : null}
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? t("rejecting") : t("confirmReject")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
