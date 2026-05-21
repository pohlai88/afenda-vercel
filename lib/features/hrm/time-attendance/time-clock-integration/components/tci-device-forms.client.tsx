"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Field,
  FieldError,
  FieldLabel,
} from "#components2/ui/field"
import { Input } from "#components2/ui/input"
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
  revokeTimeClockDeviceAction,
  upsertTimeClockDeviceAction,
  type TimeClockDeviceMutationFormState,
} from "../actions/tci-device.actions"
import { upsertTimeClockMappingAction } from "../actions/tci-mapping.actions"
import { TCI_DEVICE_TYPES } from "../schemas/tci-workflow-state.shared"

type Choice = { readonly id: string; readonly label: string }

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function TimeClockDeviceRegisterDialog() {
  const t = useTranslations("Dashboard.Hrm.timeClock.devices")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    TimeClockDeviceMutationFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await upsertTimeClockDeviceAction(prev, formData)
    if (next?.ok) setOpen(false)
    return next
  }, undefined)

  const externalId = useId()
  const nameId = useId()
  const typeId = useId()
  const locationId = useId()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("registerOpen")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("registerDialogTitle")}</DialogTitle>
          <DialogDescription>{t("registerDialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          {!state?.ok && state?.errors?.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("registerDialogTitle")}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor={externalId}>{t("fieldExternalId")}</FieldLabel>
            <Input id={externalId} name="externalDeviceId" required maxLength={120} />
            {!state?.ok && state?.errors?.externalDeviceId ? (
              <FieldError>{state.errors.externalDeviceId}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={nameId}>{t("fieldName")}</FieldLabel>
            <Input id={nameId} name="name" required maxLength={200} />
            {!state?.ok && state?.errors?.name ? (
              <FieldError>{state.errors.name}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={typeId}>{t("fieldDeviceType")}</FieldLabel>
            <select
              id={typeId}
              name="deviceType"
              required
              defaultValue="kiosk"
              className={SELECT_CLASS}
            >
              {TCI_DEVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`deviceTypeLabels.${type}`)}
                </option>
              ))}
            </select>
            {!state?.ok && state?.errors?.deviceType ? (
              <FieldError>{state.errors.deviceType}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={locationId}>{t("fieldLocation")}</FieldLabel>
            <Input id={locationId} name="locationRef" maxLength={200} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("submitting")}
                </>
              ) : (
                t("submitRegister")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TimeClockMappingUpsertDialog({
  employees,
  devices,
}: {
  employees: ReadonlyArray<Choice>
  devices: ReadonlyArray<Choice>
}) {
  const t = useTranslations("Dashboard.Hrm.timeClock.mappings")
  const tCommon = useTranslations("Dashboard.Hrm.timeClock.devices")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    TimeClockDeviceMutationFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await upsertTimeClockMappingAction(prev, formData)
    if (next?.ok) setOpen(false)
    return next
  }, undefined)

  const employeeId = useId()
  const deviceId = useId()
  const clockUserId = useId()
  const badgeId = useId()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("createOpen")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDialogTitle")}</DialogTitle>
          <DialogDescription>{t("createDialogDescription")}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          {!state?.ok && state?.errors?.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("createDialogTitle")}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}
          <Field>
            <FieldLabel htmlFor={employeeId}>{t("fieldEmployee")}</FieldLabel>
            <select
              id={employeeId}
              name="employeeId"
              required
              className={SELECT_CLASS}
              defaultValue=""
            >
              <option value="" disabled>
                —
              </option>
              {employees.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
            {!state?.ok && state?.errors?.employeeId ? (
              <FieldError>{state.errors.employeeId}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={deviceId}>{t("fieldDevice")}</FieldLabel>
            <select
              id={deviceId}
              name="deviceId"
              required
              className={SELECT_CLASS}
              defaultValue=""
            >
              <option value="" disabled>
                —
              </option>
              {devices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </select>
            {!state?.ok && state?.errors?.deviceId ? (
              <FieldError>{state.errors.deviceId}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={clockUserId}>{t("fieldClockUser")}</FieldLabel>
            <Input id={clockUserId} name="clockUserId" required maxLength={120} />
            {!state?.ok && state?.errors?.clockUserId ? (
              <FieldError>{state.errors.clockUserId}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={badgeId}>{t("fieldBadge")}</FieldLabel>
            <Input id={badgeId} name="badgeId" maxLength={120} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {tCommon("submitting")}
                </>
              ) : (
                t("submitCreate")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TimeClockDeviceRevokeButton({ deviceId }: { deviceId: string }) {
  const t = useTranslations("Dashboard.Hrm.timeClock.devices")
  const [state, action, pending] = useActionState<
    TimeClockDeviceMutationFormState | undefined,
    FormData
  >(revokeTimeClockDeviceAction, undefined)

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="deviceId" value={deviceId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? t("revoking") : t("revoke")}
      </Button>
      {state && !state.ok && state.errors.form ? (
        <p className="text-xs text-destructive">{state.errors.form}</p>
      ) : null}
    </form>
  )
}
