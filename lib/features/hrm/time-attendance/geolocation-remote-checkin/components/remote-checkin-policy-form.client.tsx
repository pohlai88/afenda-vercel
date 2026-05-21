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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"

import { HRM_EMPLOYMENT_TYPES } from "../../../employee-management/employee-records-management/schemas/employee.schema"
import {
  upsertRemoteCheckinPolicyAction,
  type RemoteCheckinPolicyMutationFormState,
} from "#features/hrm/client"

const SCOPES = [
  "org",
  "department",
  "position",
  "employment_type",
  "policy_group",
  "employee",
] as const

type PolicyScope = (typeof SCOPES)[number]

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

type ScopeRefChoice = { readonly id: string; readonly label: string }

type Defaults = {
  readonly policyId?: string
  readonly scopeKind?: PolicyScope
  readonly scopeRef?: string | null
  readonly minGpsAccuracyMeters?: number
  readonly allowedRadiusBufferMeters?: number
  readonly shiftWindowMinutes?: number
  readonly breakWindowMinutes?: number
  readonly requireRegisteredDevice?: boolean
  readonly requireSelfie?: boolean
  readonly detectSpoofing?: boolean
  readonly allowEligibilityException?: boolean
  readonly isActive?: boolean
}

export function RemoteCheckinPolicyDialog({
  orgSlug,
  mode,
  defaults,
  scopeRefChoices,
}: {
  orgSlug: string
  mode: "create" | "edit"
  defaults?: Defaults
  scopeRefChoices?: {
    readonly employees: readonly ScopeRefChoice[]
    readonly departments: readonly ScopeRefChoice[]
    readonly positions: readonly ScopeRefChoice[]
  }
}) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.policies")
  const tScope = useTranslations(
    "Dashboard.Hrm.Geolocation.policies.scopeLabels"
  )
  const tCommon = useTranslations("Dashboard.Hrm.Geolocation")
  const [open, setOpen] = useState(false)
  const [scopeKind, setScopeKind] = useState<PolicyScope>(
    defaults?.scopeKind ?? "org"
  )
  const [state, formAction, pending] = useActionState<
    RemoteCheckinPolicyMutationFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await upsertRemoteCheckinPolicyAction(prev, formData)
    if (next?.ok) setOpen(false)
    return next
  }, undefined)
  const scopeId = useId()
  const scopeRefId = useId()
  const accuracyId = useId()
  const radiusId = useId()
  const shiftId = useId()
  const breakId = useId()

  const scopeRefHint = useMemo(() => {
    switch (scopeKind) {
      case "org":
        return t("fieldScopeRefHintOrg")
      case "department":
        return t("fieldScopeRefHintDepartment")
      case "position":
        return t("fieldScopeRefHintPosition")
      case "employment_type":
        return t("fieldScopeRefHintEmploymentType")
      case "policy_group":
        return t("fieldScopeRefHintPolicyGroup")
      case "employee":
        return t("fieldScopeRefHintEmployee")
    }
  }, [scopeKind, t])

  const triggerLabel = mode === "create" ? t("createOpen") : t("editOpen")
  const submitLabel = mode === "create" ? t("submitCreate") : t("submitUpdate")
  const title =
    mode === "create" ? t("createDialogTitle") : t("editDialogTitle")
  const description =
    mode === "create"
      ? t("createDialogDescription")
      : t("editDialogDescription")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={mode === "create" ? "default" : "outline"}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          {defaults?.policyId ? (
            <input type="hidden" name="policyId" value={defaults.policyId} />
          ) : null}

          {!state?.ok && state?.errors?.form ? (
            <Alert variant="destructive">
              <AlertTitle>{title}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={scopeId}>{t("fieldScopeKind")}</FieldLabel>
              <select
                id={scopeId}
                name="scopeKind"
                required
                value={scopeKind}
                onChange={(event) =>
                  setScopeKind(event.target.value as PolicyScope)
                }
                className={SELECT_CLASS}
              >
                {SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {tScope(scope)}
                  </option>
                ))}
              </select>
              {!state?.ok && state?.errors?.scopeKind ? (
                <FieldError>{state.errors.scopeKind}</FieldError>
              ) : null}
            </Field>
            <ScopeRefField
              scopeKind={scopeKind}
              scopeRefId={scopeRefId}
              defaultValue={defaults?.scopeRef ?? ""}
              hint={scopeRefHint}
              choices={scopeRefChoices}
              fieldError={
                state && !state.ok ? state.errors.scopeRef : undefined
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={accuracyId}>
                {t("fieldMinGpsAccuracyMeters")}
              </FieldLabel>
              <Input
                id={accuracyId}
                name="minGpsAccuracyMeters"
                type="number"
                min={1}
                max={1_000}
                defaultValue={defaults?.minGpsAccuracyMeters ?? 100}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={radiusId}>
                {t("fieldAllowedRadiusBufferMeters")}
              </FieldLabel>
              <Input
                id={radiusId}
                name="allowedRadiusBufferMeters"
                type="number"
                min={0}
                max={2_000}
                defaultValue={defaults?.allowedRadiusBufferMeters ?? 50}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={shiftId}>
                {t("fieldShiftWindowMinutes")}
              </FieldLabel>
              <Input
                id={shiftId}
                name="shiftWindowMinutes"
                type="number"
                min={0}
                max={720}
                defaultValue={defaults?.shiftWindowMinutes ?? 60}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={breakId}>
                {t("fieldBreakWindowMinutes")}
              </FieldLabel>
              <Input
                id={breakId}
                name="breakWindowMinutes"
                type="number"
                min={0}
                max={360}
                defaultValue={defaults?.breakWindowMinutes ?? 30}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PolicyToggle
              name="requireRegisteredDevice"
              label={t("fieldRequireRegisteredDevice")}
              defaultChecked={defaults?.requireRegisteredDevice ?? true}
            />
            <PolicyToggle
              name="requireSelfie"
              label={t("fieldRequireSelfie")}
              defaultChecked={defaults?.requireSelfie ?? false}
            />
            <PolicyToggle
              name="detectSpoofing"
              label={t("fieldDetectSpoofing")}
              defaultChecked={defaults?.detectSpoofing ?? true}
            />
            <PolicyToggle
              name="allowEligibilityException"
              label={t("fieldAllowEligibilityException")}
              defaultChecked={defaults?.allowEligibilityException ?? true}
            />
            <PolicyToggle
              name="isActive"
              label={t("fieldIsActive")}
              defaultChecked={defaults?.isActive ?? true}
            />
          </div>

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
                submitLabel
              )}
            </Button>
          </DialogFooter>
          <span className="sr-only">{tCommon("pageTitle")}</span>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ScopeRefField({
  scopeKind,
  scopeRefId,
  defaultValue,
  hint,
  choices,
  fieldError,
}: {
  scopeKind: PolicyScope
  scopeRefId: string
  defaultValue: string
  hint: string
  choices?: {
    readonly employees: readonly ScopeRefChoice[]
    readonly departments: readonly ScopeRefChoice[]
    readonly positions: readonly ScopeRefChoice[]
  }
  fieldError?: string
}) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.policies")

  if (scopeKind === "org") {
    return (
      <Field>
        <FieldLabel htmlFor={scopeRefId}>{t("fieldScopeRef")}</FieldLabel>
        <FieldDescription>{hint}</FieldDescription>
        <input type="hidden" name="scopeRef" value="" />
        <Input
          id={scopeRefId}
          disabled
          value="—"
          aria-describedby={`${scopeRefId}-hint`}
        />
      </Field>
    )
  }

  const selectOptions = (() => {
    switch (scopeKind) {
      case "employee":
        return choices?.employees ?? []
      case "department":
        return choices?.departments ?? []
      case "position":
        return choices?.positions ?? []
      default:
        return []
    }
  })()

  if (selectOptions.length > 0) {
    return (
      <Field>
        <FieldLabel htmlFor={scopeRefId}>{t("fieldScopeRef")}</FieldLabel>
        <FieldDescription id={`${scopeRefId}-hint`}>{hint}</FieldDescription>
        <select
          id={scopeRefId}
          name="scopeRef"
          required
          defaultValue={defaultValue}
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={`${scopeRefId}-hint`}
        >
          <option value="">{t("fieldScopeRefSelectPlaceholder")}</option>
          {selectOptions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
        {fieldError ? <FieldError>{fieldError}</FieldError> : null}
      </Field>
    )
  }

  if (scopeKind === "employment_type") {
    return (
      <Field>
        <FieldLabel htmlFor={scopeRefId}>{t("fieldScopeRef")}</FieldLabel>
        <FieldDescription id={`${scopeRefId}-hint`}>{hint}</FieldDescription>
        <select
          id={scopeRefId}
          name="scopeRef"
          required
          defaultValue={defaultValue}
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldError)}
        >
          <option value="">{t("fieldScopeRefSelectPlaceholder")}</option>
          {HRM_EMPLOYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {fieldError ? <FieldError>{fieldError}</FieldError> : null}
      </Field>
    )
  }

  return (
    <Field>
      <FieldLabel htmlFor={scopeRefId}>{t("fieldScopeRef")}</FieldLabel>
      <FieldDescription id={`${scopeRefId}-hint`}>{hint}</FieldDescription>
      <Input
        id={scopeRefId}
        name="scopeRef"
        maxLength={160}
        required
        defaultValue={defaultValue}
        placeholder={hint}
        aria-invalid={Boolean(fieldError)}
        aria-describedby={`${scopeRefId}-hint`}
      />
      {fieldError ? <FieldError>{fieldError}</FieldError> : null}
    </Field>
  )
}

function PolicyToggle({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked: boolean
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 rounded border border-border bg-muted/40 p-2 text-sm"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4"
      />
      <span>{label}</span>
    </label>
  )
}
