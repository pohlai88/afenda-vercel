"use client"

import { useActionState, useId, useMemo, useState } from "react"
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
  createLeaveTypeAction,
  updateLeaveTypeAction,
  type LeaveTypeMutationFormState,
} from "#features/hrm/client"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"
import { HRM_LEAVE_ACCRUAL_METHODS } from "../data/leave-policy-display.shared"
import type { LeaveTypeAdminRow } from "../data/leave-policy.queries.server"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

type LeaveTypeFormProps = {
  /** Optional row ÔåÆ edit mode; absent ÔåÆ create mode. */
  row?: LeaveTypeAdminRow
  onSuccess?: () => void
}

/**
 * Shared body for the create / edit leave-type dialogs.
 *
 * Mirrors the {@link AttendanceRecordEventForm} convention: a single
 * `useActionState` call dispatched against the right Server Action,
 * `onSuccess` close callback held in a ref so React 19's strict
 * `useEffect` deps reading rule doesn't fight us. The accrual-method
 * select drives a small render-time projection so tier days only show
 * when relevant.
 */
export function LeaveTypeForm({ row, onSuccess }: LeaveTypeFormProps) {
  const t = useTranslations("Dashboard.Hrm.policies")
  const isEdit = row !== undefined
  const action = isEdit ? updateLeaveTypeAction : createLeaveTypeAction

  const [state, formAction, pending] = useActionState<
    LeaveTypeMutationFormState | undefined,
    FormData
  >(action, undefined)

  const codeId = useId()
  const accrualId = useId()
  const paidId = useId()
  const genderId = useId()
  const tier1DaysId = useId()
  const tier1YearsId = useId()
  const tier2DaysId = useId()
  const tier2YearsId = useId()
  const tier3DaysId = useId()
  const fixedId = useId()
  const carryId = useId()
  const expiryId = useId()
  const minNoticeId = useId()
  const maxConsecutiveId = useId()
  const requiresAttachmentId = useId()
  useFormSuccess(state, onSuccess)

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  const [accrualMethod, setAccrualMethod] = useState(
    row?.accrualMethod ?? "annual_grant"
  )
  const showTiers = accrualMethod === "annual_grant"
  const showFixed = accrualMethod === "fixed_grant"

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isEdit ? (
        <input type="hidden" name="leaveTypeId" value={row!.id} />
      ) : null}

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("leaveType.errorTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field data-invalid={fieldErrors?.code ? true : undefined}>
        <FieldLabel htmlFor={codeId}>{t("leaveType.fieldCode")}</FieldLabel>
        <Input
          id={codeId}
          name="code"
          required
          maxLength={32}
          defaultValue={row?.code ?? ""}
          autoComplete="off"
          aria-invalid={Boolean(fieldErrors?.code)}
        />
        <FieldDescription>{t("leaveType.fieldCodeHint")}</FieldDescription>
        {fieldErrors?.code ? <FieldError>{fieldErrors.code}</FieldError> : null}
      </Field>

      <Field data-invalid={fieldErrors?.accrualMethod ? true : undefined}>
        <FieldLabel htmlFor={accrualId}>
          {t("leaveType.fieldAccrualMethod")}
        </FieldLabel>
        <select
          id={accrualId}
          name="accrualMethod"
          required
          defaultValue={accrualMethod}
          onChange={(event) => setAccrualMethod(event.target.value)}
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldErrors?.accrualMethod)}
        >
          {HRM_LEAVE_ACCRUAL_METHODS.map((method) => (
            <option key={method} value={method}>
              {t(`leaveType.accrualMethod.${method}`)}
            </option>
          ))}
        </select>
        {fieldErrors?.accrualMethod ? (
          <FieldError>{fieldErrors.accrualMethod}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={paidId}>{t("leaveType.fieldPaid")}</FieldLabel>
        <select
          id={paidId}
          name="paid"
          defaultValue={(row?.paid ?? true).toString()}
          className={SELECT_CLASS}
        >
          <option value="true">{t("leaveType.paidYes")}</option>
          <option value="false">{t("leaveType.paidNo")}</option>
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor={genderId}>
          {t("leaveType.fieldGenderRestriction")}
        </FieldLabel>
        <select
          id={genderId}
          name="genderRestriction"
          defaultValue={row?.genderRestriction ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">{t("leaveType.fieldGenderNone")}</option>
          <option value="male">{t("leaveType.genderRestriction.male")}</option>
          <option value="female">
            {t("leaveType.genderRestriction.female")}
          </option>
        </select>
      </Field>

      {showTiers ? (
        <>
          <Field data-invalid={fieldErrors?.tier1Days ? true : undefined}>
            <FieldLabel htmlFor={tier1DaysId}>
              {t("leaveType.fieldTier1Days")}
            </FieldLabel>
            <Input
              id={tier1DaysId}
              name="tier1Days"
              type="number"
              min={1}
              defaultValue={row?.tier1Days ?? ""}
              aria-invalid={Boolean(fieldErrors?.tier1Days)}
            />
            <FieldDescription>{t("leaveType.tierHint")}</FieldDescription>
            {fieldErrors?.tier1Days ? (
              <FieldError>{fieldErrors.tier1Days}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor={tier1YearsId}>
              {t("leaveType.fieldTier1MaxYears")}
            </FieldLabel>
            <Input
              id={tier1YearsId}
              name="tier1MaxYears"
              type="number"
              min={1}
              defaultValue={row?.tier1MaxYears ?? ""}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={tier2DaysId}>
              {t("leaveType.fieldTier2Days")}
            </FieldLabel>
            <Input
              id={tier2DaysId}
              name="tier2Days"
              type="number"
              min={1}
              defaultValue={row?.tier2Days ?? ""}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={tier2YearsId}>
              {t("leaveType.fieldTier2MaxYears")}
            </FieldLabel>
            <Input
              id={tier2YearsId}
              name="tier2MaxYears"
              type="number"
              min={1}
              defaultValue={row?.tier2MaxYears ?? ""}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={tier3DaysId}>
              {t("leaveType.fieldTier3Days")}
            </FieldLabel>
            <Input
              id={tier3DaysId}
              name="tier3Days"
              type="number"
              min={1}
              defaultValue={row?.tier3Days ?? ""}
            />
          </Field>
        </>
      ) : null}

      {showFixed ? (
        <Field data-invalid={fieldErrors?.fixedDaysPerYear ? true : undefined}>
          <FieldLabel htmlFor={fixedId}>
            {t("leaveType.fieldFixedDays")}
          </FieldLabel>
          <Input
            id={fixedId}
            name="fixedDaysPerYear"
            type="number"
            min={1}
            defaultValue={row?.fixedDaysPerYear ?? ""}
            aria-invalid={Boolean(fieldErrors?.fixedDaysPerYear)}
          />
          <FieldDescription>{t("leaveType.fixedDaysHint")}</FieldDescription>
          {fieldErrors?.fixedDaysPerYear ? (
            <FieldError>{fieldErrors.fixedDaysPerYear}</FieldError>
          ) : null}
        </Field>
      ) : null}

      <Field>
        <FieldLabel htmlFor={carryId}>
          {t("leaveType.fieldMaxCarryForward")}
        </FieldLabel>
        <Input
          id={carryId}
          name="maxCarryForwardDays"
          type="number"
          min={0}
          defaultValue={row?.maxCarryForwardDays ?? 0}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={expiryId}>
          {t("leaveType.fieldCarryForwardExpiry")}
        </FieldLabel>
        <Input
          id={expiryId}
          name="carryForwardExpiryMonths"
          type="number"
          min={1}
          defaultValue={row?.carryForwardExpiryMonths ?? ""}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={minNoticeId}>
          {t("leaveType.fieldMinNoticeDays")}
        </FieldLabel>
        <Input
          id={minNoticeId}
          name="minNoticeDays"
          type="number"
          min={0}
          defaultValue={row?.minNoticeDays ?? ""}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={maxConsecutiveId}>
          {t("leaveType.fieldMaxConsecutiveDays")}
        </FieldLabel>
        <Input
          id={maxConsecutiveId}
          name="maxConsecutiveDays"
          type="number"
          min={1}
          defaultValue={row?.maxConsecutiveDays ?? ""}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={requiresAttachmentId}>
          {t("leaveType.fieldRequiresAttachment")}
        </FieldLabel>
        <select
          id={requiresAttachmentId}
          name="requiresAttachment"
          className={SELECT_CLASS}
          defaultValue={row?.requiresAttachment ? "true" : "false"}
        >
          <option value="false">{t("leaveType.requiresAttachmentNo")}</option>
          <option value="true">{t("leaveType.requiresAttachmentYes")}</option>
        </select>
      </Field>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {isEdit
              ? t("leaveType.submitUpdating")
              : t("leaveType.submitCreating")}
          </>
        ) : isEdit ? (
          t("leaveType.submitUpdate")
        ) : (
          t("leaveType.submitCreate")
        )}
      </Button>
    </form>
  )
}
