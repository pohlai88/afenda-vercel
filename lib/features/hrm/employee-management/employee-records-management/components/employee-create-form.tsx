"use client"

import { useActionState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { createEmployeeAction } from "#features/hrm/client"

type EmployeeCreateFormProps = {
  orgSlug: string
  onSuccess?: () => void
}

export function EmployeeCreateForm({ orgSlug, onSuccess }: EmployeeCreateFormProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")
  const [state, formAction, pending] = useActionState(
    createEmployeeAction,
    undefined
  )

  const numInvalid = Boolean(state && !state.ok && state.errors.employeeNumber)
  const nameInvalid = Boolean(state && !state.ok && state.errors.legalName)
  const emailInvalid = Boolean(state && !state.ok && state.errors.email)

  useEffect(() => {
    if (state?.ok) onSuccess?.()
  }, [onSuccess, state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={numInvalid ? true : undefined}>
        <FieldLabel htmlFor="employee-number">
          {t("fieldEmployeeNumber")}
        </FieldLabel>
        <Input
          id="employee-number"
          name="employeeNumber"
          required
          autoComplete="off"
          aria-invalid={numInvalid}
        />
        {numInvalid && state && !state.ok ? (
          <FieldError>{state.errors.employeeNumber}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={nameInvalid ? true : undefined}>
        <FieldLabel htmlFor="employee-legal-name">
          {t("fieldLegalName")}
        </FieldLabel>
        <Input
          id="employee-legal-name"
          name="legalName"
          required
          autoComplete="name"
          aria-invalid={nameInvalid}
        />
        {nameInvalid && state && !state.ok ? (
          <FieldError>{state.errors.legalName}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="employee-preferred-name">
          {t("fieldPreferredName")}{" "}
          <span className="font-normal text-muted-foreground">
            ({t("optional")})
          </span>
        </FieldLabel>
        <Input
          id="employee-preferred-name"
          name="preferredName"
          autoComplete="nickname"
        />
      </Field>

      <Field data-invalid={emailInvalid ? true : undefined}>
        <FieldLabel htmlFor="employee-email">
          {t("fieldEmail")}{" "}
          <span className="font-normal text-muted-foreground">
            ({t("optional")})
          </span>
        </FieldLabel>
        <Input
          id="employee-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={emailInvalid}
        />
        {emailInvalid && state && !state.ok ? (
          <FieldError>{state.errors.email}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="employee-dept-id">
            {t("fieldDepartmentId")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </FieldLabel>
          <Input
            id="employee-dept-id"
            name="currentDepartmentId"
            autoComplete="off"
            placeholder="UUID"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="employee-position-id">
            {t("fieldPositionId")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </FieldLabel>
          <Input
            id="employee-position-id"
            name="currentPositionId"
            autoComplete="off"
            placeholder="UUID"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="employee-grade-id">
            {t("fieldJobGradeId")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </FieldLabel>
          <Input
            id="employee-grade-id"
            name="currentJobGradeId"
            autoComplete="off"
            placeholder="UUID"
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            Saving…
          </>
        ) : (
          t("createSubmit")
        )}
      </Button>
    </form>
  )
}
