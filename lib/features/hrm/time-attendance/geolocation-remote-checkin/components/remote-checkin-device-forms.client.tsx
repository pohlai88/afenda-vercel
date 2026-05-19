"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Field,
  FieldDescription,
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
  registerRemoteCheckinDeviceAction,
  revokeRemoteCheckinDeviceAction,
  type RemoteCheckinDeviceMutationFormState,
} from "#features/hrm/client"

type Choice = { readonly id: string; readonly label: string }

export function RemoteCheckinDeviceRegisterDialog({
  orgSlug,
  employees,
  defaultEmployeeId,
}: {
  orgSlug: string
  employees: ReadonlyArray<Choice>
  defaultEmployeeId?: string
}) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.devices")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    RemoteCheckinDeviceMutationFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await registerRemoteCheckinDeviceAction(prev, formData)
    if (next?.ok) setOpen(false)
    return next
  }, undefined)
  const employeeFieldId = useId()
  const labelId = useId()
  const fingerprintId = useId()

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
          <input type="hidden" name="orgSlug" value={orgSlug} />
          {!state?.ok && state?.errors?.form ? (
            <Alert variant="destructive">
              <AlertTitle>{t("registerOpen")}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}

          {employees.length > 0 ? (
            <Field>
              <FieldLabel htmlFor={employeeFieldId}>
                {t("fieldEmployee")}
              </FieldLabel>
              <select
                id={employeeFieldId}
                name="employeeId"
                defaultValue={defaultEmployeeId ?? ""}
                required
                className="h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
          ) : defaultEmployeeId ? (
            <input
              type="hidden"
              name="employeeId"
              value={defaultEmployeeId}
            />
          ) : null}

          <Field>
            <FieldLabel htmlFor={labelId}>{t("fieldDeviceLabel")}</FieldLabel>
            <Input id={labelId} name="deviceLabel" required maxLength={128} />
            {!state?.ok && state?.errors?.deviceLabel ? (
              <FieldError>{state.errors.deviceLabel}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={fingerprintId}>
              {t("fieldDeviceFingerprint")}
            </FieldLabel>
            <Input
              id={fingerprintId}
              name="deviceFingerprint"
              required
              maxLength={256}
              minLength={8}
            />
            <FieldDescription>{t("fieldDeviceFingerprint")}</FieldDescription>
            {!state?.ok && state?.errors?.deviceFingerprint ? (
              <FieldError>{state.errors.deviceFingerprint}</FieldError>
            ) : null}
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden
                  />
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

export function RemoteCheckinDeviceRevokeButton({
  deviceId,
  deviceLabel,
}: {
  deviceId: string
  deviceLabel: string
}) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.devices")
  const [state, formAction, pending] = useActionState<
    RemoteCheckinDeviceMutationFormState | undefined,
    FormData
  >(revokeRemoteCheckinDeviceAction, undefined)
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="deviceId" value={deviceId} />
      <Button
        type="submit"
        size="sm"
        variant="destructive"
        disabled={pending}
        title={t("confirmRevoke", { label: deviceLabel })}
      >
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("revoking")}
          </>
        ) : (
          t("revokeOpen")
        )}
      </Button>
      {!state?.ok && state?.errors?.form ? (
        <span className="text-xs text-destructive">{state.errors.form}</span>
      ) : null}
    </form>
  )
}
