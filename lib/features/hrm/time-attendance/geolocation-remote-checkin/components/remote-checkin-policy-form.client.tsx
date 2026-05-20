"use client"

import { useActionState, useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
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

import { upsertRemoteCheckinPolicyAction } from "../actions/remote-checkin-policy.actions"
import type { RemoteCheckinPolicyMutationFormState } from "../../../types"

const SCOPES = [
  "org",
  "department",
  "position",
  "employment_type",
  "policy_group",
  "employee",
] as const

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

type Defaults = {
  readonly policyId?: string
  readonly scopeKind?: (typeof SCOPES)[number]
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
}: {
  orgSlug: string
  mode: "create" | "edit"
  defaults?: Defaults
}) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.policies")
  const tScope = useTranslations(
    "Dashboard.Hrm.Geolocation.policies.scopeLabels"
  )
  const tCommon = useTranslations("Dashboard.Hrm.Geolocation")
  const [open, setOpen] = useState(false)
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
                defaultValue={defaults?.scopeKind ?? "org"}
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
            <Field>
              <FieldLabel htmlFor={scopeRefId}>{t("fieldScopeRef")}</FieldLabel>
              <Input
                id={scopeRefId}
                name="scopeRef"
                maxLength={160}
                placeholder={t("fieldScopeRefHint")}
                defaultValue={defaults?.scopeRef ?? ""}
              />
            </Field>
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
