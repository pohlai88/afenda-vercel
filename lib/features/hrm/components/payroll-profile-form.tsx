"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Field, FieldError, FieldLabel } from "#components/ui/field"
import { Input } from "#components/ui/input"

import { upsertPayrollProfileAction } from "#features/hrm/client"

import { HRM_PAY_SCHEDULES } from "../schemas/payroll-profile.schema"
import type { PayrollProfileCurrentRow } from "../types"

type PayrollProfileFormProps = {
  orgSlug: string
  employeeId: string
  current: PayrollProfileCurrentRow | null
  currentEffectiveLabel: string | null
}

function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function PayrollProfileForm({
  orgSlug,
  employeeId,
  current,
  currentEffectiveLabel,
}: PayrollProfileFormProps) {
  const t = useTranslations("Dashboard.Hrm.workforce")
  const [state, formAction, pending] = useActionState(
    upsertPayrollProfileAction,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="employeeId" value={employeeId} />

      {current && currentEffectiveLabel ? (
        <p className="text-muted-foreground text-xs">
          {t("payrollCurrentEffectiveFrom", {
            date: currentEffectiveLabel,
          })}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">{t("payrollNoProfile")}</p>
      )}

      {state && !state.ok && state.errors.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{state.errors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={state && !state.ok && state.errors.effectiveFrom}>
        <FieldLabel htmlFor="payroll-effective-from">{t("payrollNewEffectiveFrom")}</FieldLabel>
        <Input
          id="payroll-effective-from"
          name="effectiveFrom"
          type="date"
          required
          defaultValue={todayIsoDate()}
          aria-invalid={Boolean(state && !state.ok && state.errors.effectiveFrom)}
        />
        {state && !state.ok && state.errors.effectiveFrom ? (
          <FieldError>{state.errors.effectiveFrom}</FieldError>
        ) : null}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="payroll-country">{t("payrollCountry")}</FieldLabel>
          <Input
            id="payroll-country"
            name="countryCode"
            defaultValue={current?.countryCode ?? "MY"}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="payroll-tax-res">{t("payrollTaxResidency")}</FieldLabel>
          <Input
            id="payroll-tax-res"
            name="taxResidencyCountry"
            defaultValue={current?.taxResidencyCountry ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="payroll-tax-type">{t("payrollTaxIdentifierType")}</FieldLabel>
          <Input
            id="payroll-tax-type"
            name="taxIdentifierType"
            defaultValue={current?.taxIdentifierType ?? ""}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="payroll-tax-num">{t("payrollTaxIdentifierNumber")}</FieldLabel>
          <Input
            id="payroll-tax-num"
            name="taxIdentifierNumber"
            defaultValue={current?.taxIdentifierNumber ?? ""}
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="payroll-epf">{t("payrollEpfNumber")}</FieldLabel>
          <Input id="payroll-epf" name="epfNumber" defaultValue={current?.epfNumber ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="payroll-socso">{t("payrollSocsoNumber")}</FieldLabel>
          <Input id="payroll-socso" name="socsoNumber" defaultValue={current?.socsoNumber ?? ""} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="payroll-pcb">{t("payrollPcbCategory")}</FieldLabel>
          <Input id="payroll-pcb" name="pcbCategory" defaultValue={current?.pcbCategory ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="payroll-group">{t("payrollGroupCode")}</FieldLabel>
          <Input
            id="payroll-group"
            name="payrollGroupCode"
            defaultValue={current?.payrollGroupCode ?? ""}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="payroll-bank">{t("payrollBankCode")}</FieldLabel>
          <Input id="payroll-bank" name="bankCode" defaultValue={current?.bankCode ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="payroll-bank-account">{t("payrollBankAccountToken")}</FieldLabel>
          <Input
            id="payroll-bank-account"
            name="bankAccountTokenized"
            defaultValue={current?.bankAccountTokenized ?? ""}
            autoComplete="off"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="payroll-bank-holder">{t("payrollBankHolder")}</FieldLabel>
        <Input
          id="payroll-bank-holder"
          name="bankAccountHolderName"
          defaultValue={current?.bankAccountHolderName ?? ""}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="payroll-sched">{t("payrollSchedule")}</FieldLabel>
          <select
            id="payroll-sched"
            name="paySchedule"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            defaultValue={current?.paySchedule ?? HRM_PAY_SCHEDULES[0]}
          >
            {HRM_PAY_SCHEDULES.map((s) => (
              <option key={s} value={s}>
                {t(`paySchedules.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="payroll-ccy">{t("payrollCurrency")}</FieldLabel>
          <Input id="payroll-ccy" name="payCurrency" defaultValue={current?.payCurrency ?? "MYR"} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="eisEligible"
            value="1"
            defaultChecked={current?.eisEligible ?? true}
          />
          {t("payrollEisEligible")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="hrdfApplicable"
            value="1"
            defaultChecked={current?.hrdfApplicable ?? false}
          />
          {t("payrollHrdfApplicable")}
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            {t("payrollSaving")}
          </>
        ) : (
          t("payrollSubmit")
        )}
      </Button>
    </form>
  )
}
