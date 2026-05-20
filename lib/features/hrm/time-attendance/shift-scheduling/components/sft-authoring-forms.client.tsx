"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"

import type {
  CreateShiftTemplateFormState,
  SftCoverageFormState,
  SftPolicyFormState,
  SftRotationCycleFormState,
  SftSwapMutationFormState,
} from "../../../types"
import {
  addRotationStepAction,
  createCoverageRequirementAction,
  createRotationCycleAction,
  createShiftTemplateAction,
  submitShiftSwapRequestAction,
  updateShiftSchedulingPolicyAction,
} from "#features/hrm/client"
import {
  SFT_PATTERN_KINDS,
  SFT_SHIFT_CATEGORIES,
} from "../data/sft-shift.shared"
import type { SftTemplateChoice } from "./sft-manage-forms.client"
export type SwapAssignmentChoice = {
  readonly id: string
  readonly label: string
}

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

function templateLabel(row: SftTemplateChoice) {
  return `${row.code} · ${row.name}`
}

export function SftCreateShiftTemplateForm() {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    CreateShiftTemplateFormState | undefined,
    FormData
  >(createShiftTemplateAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sft-tpl-code">
            {t("fieldTemplateCode")}
          </FieldLabel>
          <Input
            id="sft-tpl-code"
            name="code"
            required
            maxLength={24}
            placeholder="DAY"
          />
          {errors?.code ? <FieldError>{errors.code}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-tpl-name">
            {t("fieldTemplateName")}
          </FieldLabel>
          <Input id="sft-tpl-name" name="name" required maxLength={120} />
          {errors?.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sft-tpl-start">
            {t("fieldDefaultStart")}
          </FieldLabel>
          <Input
            id="sft-tpl-start"
            name="defaultStartTime"
            type="time"
            required
            defaultValue="09:00"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-tpl-end">{t("fieldDefaultEnd")}</FieldLabel>
          <Input
            id="sft-tpl-end"
            name="defaultEndTime"
            type="time"
            required
            defaultValue="17:00"
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sft-tpl-category">
            {t("fieldShiftCategory")}
          </FieldLabel>
          <select
            id="sft-tpl-category"
            name="shiftCategory"
            className={SELECT_CLASS}
            defaultValue="general"
          >
            {SFT_SHIFT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-tpl-pattern">
            {t("fieldPatternKind")}
          </FieldLabel>
          <select
            id="sft-tpl-pattern"
            name="patternKind"
            className={SELECT_CLASS}
            defaultValue="fixed"
          >
            {SFT_PATTERN_KINDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("templateCreateSuccess")}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("templateCreateSubmitting")}
          </>
        ) : (
          t("templateCreateSubmit")
        )}
      </Button>
    </form>
  )
}

export function SftPolicyForm({
  minRestMinutesBetweenShifts,
  maxScheduledMinutesPerWeek,
  warnOnConflict,
  blockOnConflict,
}: {
  minRestMinutesBetweenShifts: number
  maxScheduledMinutesPerWeek: number
  warnOnConflict: boolean
  blockOnConflict: boolean
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftPolicyFormState | undefined,
    FormData
  >(updateShiftSchedulingPolicyAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sft-policy-rest">
            {t("fieldMinRestMinutes")}
          </FieldLabel>
          <Input
            id="sft-policy-rest"
            name="minRestMinutesBetweenShifts"
            type="number"
            min={0}
            required
            defaultValue={minRestMinutesBetweenShifts}
          />
          {errors?.minRestMinutesBetweenShifts ? (
            <FieldError>{errors.minRestMinutesBetweenShifts}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-policy-weekly">
            {t("fieldMaxWeeklyMinutes")}
          </FieldLabel>
          <Input
            id="sft-policy-weekly"
            name="maxScheduledMinutesPerWeek"
            type="number"
            min={1}
            required
            defaultValue={maxScheduledMinutesPerWeek}
          />
          {errors?.maxScheduledMinutesPerWeek ? (
            <FieldError>{errors.maxScheduledMinutesPerWeek}</FieldError>
          ) : null}
        </Field>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="warnOnConflict"
            value="true"
            defaultChecked={warnOnConflict}
          />
          {t("fieldWarnOnConflict")}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="blockOnConflict"
            value="true"
            defaultChecked={blockOnConflict}
          />
          {t("fieldBlockOnConflict")}
        </label>
      </div>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("policyUpdateSuccess")}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("policyUpdateSubmitting")}
          </>
        ) : (
          t("policyUpdateSubmit")
        )}
      </Button>
    </form>
  )
}

export type SftSkillChoice = {
  readonly id: string
  readonly code: string
  readonly name: string
}

export function SftCreateCoverageForm({
  templates,
  skills = [],
  defaultDate,
}: {
  templates: readonly SftTemplateChoice[]
  skills?: readonly SftSkillChoice[]
  defaultDate: string
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftCoverageFormState | undefined,
    FormData
  >(createCoverageRequirementAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="sft-cov-date">
          {t("fieldAttendanceDate")}
        </FieldLabel>
        <Input
          id="sft-cov-date"
          name="attendanceDate"
          type="date"
          required
          defaultValue={defaultDate}
        />
        {errors?.attendanceDate ? (
          <FieldError>{errors.attendanceDate}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-cov-tpl">{t("fieldShiftTemplate")}</FieldLabel>
        <select
          id="sft-cov-tpl"
          name="shiftTemplateId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectShiftTemplate")}
          </option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {templateLabel(row)}
            </option>
          ))}
        </select>
        {errors?.shiftTemplateId ? (
          <FieldError>{errors.shiftTemplateId}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-cov-min">{t("fieldMinHeadcount")}</FieldLabel>
        <Input
          id="sft-cov-min"
          name="minHeadcount"
          type="number"
          min={1}
          required
          defaultValue={1}
        />
        {errors?.minHeadcount ? (
          <FieldError>{errors.minHeadcount}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-cov-skill">
          {t("fieldRequiredSkill")}
        </FieldLabel>
        <select
          id="sft-cov-skill"
          name="requiredSkillId"
          className={SELECT_CLASS}
          defaultValue=""
        >
          <option value="">{t("coverageSkillNone")}</option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.code} · {skill.name}
            </option>
          ))}
        </select>
      </Field>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("coverageCreateSuccess")}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={pending || templates.length === 0}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("coverageCreateSubmitting")}
          </>
        ) : (
          t("coverageCreateSubmit")
        )}
      </Button>
    </form>
  )
}

export function SftCreateRotationCycleForm({
  templates,
}: {
  templates: readonly SftTemplateChoice[]
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftRotationCycleFormState | undefined,
    FormData
  >(createRotationCycleAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sft-rot-code">
            {t("fieldRotationCode")}
          </FieldLabel>
          <Input id="sft-rot-code" name="code" required maxLength={24} />
          {errors?.code ? <FieldError>{errors.code}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-rot-name">
            {t("fieldRotationName")}
          </FieldLabel>
          <Input id="sft-rot-name" name="name" required maxLength={120} />
          {errors?.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="sft-rot-len">
            {t("fieldCycleLengthDays")}
          </FieldLabel>
          <Input
            id="sft-rot-len"
            name="cycleLengthDays"
            type="number"
            min={1}
            max={28}
            defaultValue={7}
          />
          {errors?.cycleLengthDays ? (
            <FieldError>{errors.cycleLengthDays}</FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="sft-rot-tpl">
            {t("fieldFirstStepTemplate")}
          </FieldLabel>
          <select
            id="sft-rot-tpl"
            name="shiftTemplateId"
            className={SELECT_CLASS}
            required
            defaultValue=""
          >
            <option value="" disabled>
              {t("selectShiftTemplate")}
            </option>
            {templates.map((row) => (
              <option key={row.id} value={row.id}>
                {templateLabel(row)}
              </option>
            ))}
          </select>
          {errors?.shiftTemplateId ? (
            <FieldError>{errors.shiftTemplateId}</FieldError>
          ) : null}
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">{t("rotationCreateHint")}</p>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("rotationCreateSuccess")}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={pending || templates.length === 0}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("rotationCreateSubmitting")}
          </>
        ) : (
          t("rotationCreateSubmit")
        )}
      </Button>
    </form>
  )
}

export type RotationCycleChoice = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly cycleLengthDays: number
  readonly steps: readonly {
    readonly stepIndex: number
    readonly templateCode: string
  }[]
}

export function SftAddRotationStepForm({
  cycles,
  templates,
}: {
  cycles: readonly RotationCycleChoice[]
  templates: readonly SftTemplateChoice[]
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftRotationCycleFormState | undefined,
    FormData
  >(addRotationStepAction, undefined)

  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="sft-rot-step-cycle">
          {t("fieldRotationCycle")}
        </FieldLabel>
        <select
          id="sft-rot-step-cycle"
          name="rotationCycleId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectRotationCycle")}
          </option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.code} · {cycle.name} ({cycle.steps.length}/
              {cycle.cycleLengthDays} {t("rotationStepsLabel")})
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-rot-step-tpl">
          {t("fieldShiftTemplate")}
        </FieldLabel>
        <select
          id="sft-rot-step-tpl"
          name="shiftTemplateId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectShiftTemplate")}
          </option>
          {templates.map((row) => (
            <option key={row.id} value={row.id}>
              {templateLabel(row)}
            </option>
          ))}
        </select>
        {errors?.shiftTemplateId ? (
          <FieldError>{errors.shiftTemplateId}</FieldError>
        ) : null}
      </Field>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("rotationStepAddSuccess")}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={pending || cycles.length === 0 || templates.length === 0}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("rotationStepAddSubmitting")}
          </>
        ) : (
          t("rotationStepAddSubmit")
        )}
      </Button>
    </form>
  )
}

export function SftSubmitSwapForm({
  requesterChoices,
  counterpartyChoices,
}: {
  requesterChoices: readonly SwapAssignmentChoice[]
  counterpartyChoices: readonly SwapAssignmentChoice[]
}) {
  const t = useTranslations("Dashboard.Hrm.shiftScheduling")
  const [state, formAction, pending] = useActionState<
    SftSwapMutationFormState | undefined,
    FormData
  >(submitShiftSwapRequestAction, undefined)

  const reasonId = useId()
  const errors = state && !state.ok ? state.errors : null

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="sft-swap-mine">{t("fieldYourShift")}</FieldLabel>
        <select
          id="sft-swap-mine"
          name="requesterAssignmentId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectYourShift")}
          </option>
          {requesterChoices.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="sft-swap-other">
          {t("fieldCounterpartyShift")}
        </FieldLabel>
        <select
          id="sft-swap-other"
          name="counterpartyAssignmentId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t("selectCounterpartyShift")}
          </option>
          {counterpartyChoices.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor={reasonId}>{t("fieldSwapReason")}</FieldLabel>
        <Textarea
          id={reasonId}
          name="reason"
          required
          minLength={3}
          maxLength={500}
        />
      </Field>
      {errors?.form ? (
        <Alert variant="destructive">
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("swapSubmitSuccess")}
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={
          pending ||
          requesterChoices.length === 0 ||
          counterpartyChoices.length === 0
        }
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            {t("swapSubmitSubmitting")}
          </>
        ) : (
          t("swapSubmitSubmit")
        )}
      </Button>
    </form>
  )
}
