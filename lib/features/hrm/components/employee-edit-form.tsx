"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"

import { updateEmployeeAction } from "#features/hrm/client"

import type { EmployeeDetailRow } from "../types"

type EmployeeEditFormProps = {
  orgSlug: string
  employee: EmployeeDetailRow
}

export function EmployeeEditForm({ orgSlug, employee }: EmployeeEditFormProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")
  const [state, formAction, pending] = useActionState(
    updateEmployeeAction,
    undefined
  )

  const numInvalid = Boolean(state && !state.ok && state.errors.employeeNumber)
  const nameInvalid = Boolean(state && !state.ok && state.errors.legalName)
  const emailInvalid = Boolean(state && !state.ok && state.errors.email)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="employeeId" value={employee.id} />

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={numInvalid ? true : undefined}>
        <FieldLabel htmlFor="edit-employee-number">
          {t("fieldEmployeeNumber")}
        </FieldLabel>
        <Input
          id="edit-employee-number"
          name="employeeNumber"
          required
          defaultValue={employee.employeeNumber}
          aria-invalid={numInvalid}
        />
        {numInvalid && state && !state.ok ? (
          <FieldError>{state.errors.employeeNumber}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={nameInvalid ? true : undefined}>
        <FieldLabel htmlFor="edit-legal-name">{t("fieldLegalName")}</FieldLabel>
        <Input
          id="edit-legal-name"
          name="legalName"
          required
          defaultValue={employee.legalName}
          aria-invalid={nameInvalid}
        />
        {nameInvalid && state && !state.ok ? (
          <FieldError>{state.errors.legalName}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="edit-preferred-name">
          {t("fieldPreferredName")}{" "}
          <span className="font-normal text-muted-foreground">
            ({t("optional")})
          </span>
        </FieldLabel>
        <Input
          id="edit-preferred-name"
          name="preferredName"
          defaultValue={employee.preferredName ?? ""}
        />
      </Field>

      <Field data-invalid={emailInvalid ? true : undefined}>
        <FieldLabel htmlFor="edit-email">
          {t("fieldEmail")}{" "}
          <span className="font-normal text-muted-foreground">
            ({t("optional")})
          </span>
        </FieldLabel>
        <Input
          id="edit-email"
          name="email"
          type="email"
          defaultValue={employee.email ?? ""}
          aria-invalid={emailInvalid}
        />
        {emailInvalid && state && !state.ok ? (
          <FieldError>{state.errors.email}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="edit-dept-id">
            {t("fieldDepartmentId")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </FieldLabel>
          <Input
            id="edit-dept-id"
            name="currentDepartmentId"
            autoComplete="off"
            placeholder="UUID"
            defaultValue={employee.currentDepartmentId ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-position-id">
            {t("fieldPositionId")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </FieldLabel>
          <Input
            id="edit-position-id"
            name="currentPositionId"
            autoComplete="off"
            placeholder="UUID"
            defaultValue={employee.currentPositionId ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-grade-id">
            {t("fieldJobGradeId")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("optional")})
            </span>
          </FieldLabel>
          <Input
            id="edit-grade-id"
            name="currentJobGradeId"
            autoComplete="off"
            placeholder="UUID"
            defaultValue={employee.currentJobGradeId ?? ""}
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
            {t("saving")}
          </>
        ) : (
          t("save")
        )}
      </Button>
    </form>
  )
}
