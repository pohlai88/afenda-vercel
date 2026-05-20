"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import {
  HRM_OTM_ROUNDING_MODES,
  upsertOtmPolicyAction,
  type UpsertOtmPolicyFormState,
} from "#features/hrm/client"

import type { OtmPolicyRow } from "../data/otm-policy.server"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

type OtmPolicyFormProps = {
  policy: OtmPolicyRow
}

export function OtmPolicyForm({ policy }: OtmPolicyFormProps) {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const [state, formAction, pending] = useActionState<
    UpsertOtmPolicyFormState | undefined,
    FormData
  >(upsertOtmPolicyAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="minDurationMinutes">
          {t("policyMinDuration")}
        </FieldLabel>
        <Input
          id="minDurationMinutes"
          name="minDurationMinutes"
          type="number"
          min={0}
          defaultValue={policy.minDurationMinutes}
          disabled={pending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="defaultEarningCode">
          {t("policyDefaultEarningCode")}
        </FieldLabel>
        <Input
          id="defaultEarningCode"
          name="defaultEarningCode"
          defaultValue={policy.defaultEarningCode}
          disabled={pending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="dailyCapMinutes">{t("policyDailyCap")}</FieldLabel>
        <Input
          id="dailyCapMinutes"
          name="dailyCapMinutes"
          type="number"
          min={0}
          defaultValue={policy.dailyCapMinutes ?? ""}
          disabled={pending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="weeklyCapMinutes">
          {t("policyWeeklyCap")}
        </FieldLabel>
        <Input
          id="weeklyCapMinutes"
          name="weeklyCapMinutes"
          type="number"
          min={0}
          defaultValue={policy.weeklyCapMinutes ?? ""}
          disabled={pending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="monthlyCapMinutes">
          {t("policyMonthlyCap")}
        </FieldLabel>
        <Input
          id="monthlyCapMinutes"
          name="monthlyCapMinutes"
          type="number"
          min={0}
          defaultValue={policy.monthlyCapMinutes ?? ""}
          disabled={pending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="roundingIntervalMinutes">
          {t("policyRoundingInterval")}
        </FieldLabel>
        <Input
          id="roundingIntervalMinutes"
          name="roundingIntervalMinutes"
          type="number"
          min={0}
          defaultValue={policy.roundingIntervalMinutes ?? ""}
          disabled={pending}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="roundingMode">{t("policyRoundingMode")}</FieldLabel>
        <select
          id="roundingMode"
          name="roundingMode"
          className={SELECT_CLASS}
          defaultValue={policy.roundingMode}
          disabled={pending}
        >
          {HRM_OTM_ROUNDING_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`roundingModeLabels.${mode}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field orientation="horizontal" className="sm:col-span-2">
        <input
          id="compareAttendanceEnabled"
          name="compareAttendanceEnabled"
          type="checkbox"
          defaultChecked={policy.compareAttendanceEnabled}
          disabled={pending}
        />
        <FieldLabel htmlFor="compareAttendanceEnabled">
          {t("policyCompareAttendance")}
        </FieldLabel>
      </Field>
      <Field orientation="horizontal" className="sm:col-span-2">
        <input
          id="compareShiftEnabled"
          name="compareShiftEnabled"
          type="checkbox"
          defaultChecked={policy.compareShiftEnabled}
          disabled={pending}
        />
        <FieldLabel htmlFor="compareShiftEnabled">
          {t("policyCompareShift")}
        </FieldLabel>
      </Field>
      <Field>
        <FieldLabel htmlFor="claimDeadlineDays">
          {t("policyClaimDeadlineDays")}
        </FieldLabel>
        <Input
          id="claimDeadlineDays"
          name="claimDeadlineDays"
          type="number"
          min={0}
          defaultValue={policy.claimDeadlineDays ?? ""}
          disabled={pending}
        />
      </Field>
      <Field orientation="horizontal" className="sm:col-span-2">
        <input
          id="allowCompensatoryTime"
          name="allowCompensatoryTime"
          type="checkbox"
          defaultChecked={policy.allowCompensatoryTime}
          disabled={pending}
        />
        <FieldLabel htmlFor="allowCompensatoryTime">
          {t("policyAllowCompensatory")}
        </FieldLabel>
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="compensatoryLeaveTypeCode">
          {t("policyCompensatoryLeaveCode")}
        </FieldLabel>
        <Input
          id="compensatoryLeaveTypeCode"
          name="compensatoryLeaveTypeCode"
          defaultValue={policy.compensatoryLeaveTypeCode ?? ""}
          disabled={pending}
        />
      </Field>
      {errors?.form ? <FieldError className="sm:col-span-2">{errors.form}</FieldError> : null}
      {state?.ok ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          {t("policySaveSuccess")}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
                aria-hidden
              />
              {t("policySaveSubmitting")}
            </>
          ) : (
            t("policySave")
          )}
        </Button>
      </div>
    </form>
  )
}
