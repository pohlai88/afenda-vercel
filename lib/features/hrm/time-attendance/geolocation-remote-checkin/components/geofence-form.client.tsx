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
import { Textarea } from "#components2/ui/textarea"
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
  deprecateGeofenceAction,
  upsertGeofenceAction,
  type GeofenceMutationFormState,
} from "#features/hrm/client"

const SCOPE_KINDS = [
  "office",
  "branch",
  "project_site",
  "client_site",
  "field_site",
  "home_office",
] as const

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

type GeofenceFormProps = {
  readonly orgSlug: string
  readonly mode: "create" | "edit"
  readonly defaults?: {
    readonly geofenceId?: string
    readonly code?: string
    readonly label?: string
    readonly scopeKind?: (typeof SCOPE_KINDS)[number]
    readonly latitude?: string
    readonly longitude?: string
    readonly radiusMeters?: number
    readonly bufferMeters?: number
    readonly countryCode?: string | null
    readonly legalEntityCode?: string | null
    readonly notes?: string | null
  }
}

export function GeofenceUpsertDialog({ orgSlug, mode, defaults }: GeofenceFormProps) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.geofences")
  const tScope = useTranslations("Dashboard.Hrm.Geolocation.geofences.scopeLabels")
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<
    GeofenceMutationFormState | undefined,
    FormData
  >(async (prev, formData) => {
    const next = await upsertGeofenceAction(prev, formData)
    if (next?.ok) setOpen(false)
    return next
  }, undefined)
  const codeId = useId()
  const labelId = useId()
  const latId = useId()
  const lngId = useId()
  const radiusId = useId()
  const bufferId = useId()
  const countryId = useId()
  const legalId = useId()
  const notesId = useId()
  const scopeId = useId()

  const triggerLabel = mode === "create" ? t("createOpen") : t("editOpen")
  const submitLabel = mode === "create" ? t("submitCreate") : t("submitUpdate")
  const dialogTitle =
    mode === "create" ? t("createDialogTitle") : t("editDialogTitle")
  const dialogDescription =
    mode === "create" ? t("createDialogDescription") : t("editDialogDescription")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={mode === "create" ? "default" : "outline"}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          {defaults?.geofenceId ? (
            <input
              type="hidden"
              name="geofenceId"
              value={defaults.geofenceId}
            />
          ) : null}

          {!state?.ok && state?.errors?.form ? (
            <Alert variant="destructive">
              <AlertTitle>{dialogTitle}</AlertTitle>
              <AlertDescription>{state.errors.form}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={codeId}>{t("fieldCode")}</FieldLabel>
              <Input
                id={codeId}
                name="code"
                required
                maxLength={48}
                defaultValue={defaults?.code ?? ""}
              />
              {!state?.ok && state?.errors?.code ? (
                <FieldError>{state.errors.code}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor={labelId}>{t("fieldLabel")}</FieldLabel>
              <Input
                id={labelId}
                name="label"
                required
                maxLength={160}
                defaultValue={defaults?.label ?? ""}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor={scopeId}>{t("fieldScopeKind")}</FieldLabel>
            <select
              id={scopeId}
              name="scopeKind"
              required
              defaultValue={defaults?.scopeKind ?? "office"}
              className={SELECT_CLASS}
            >
              {SCOPE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {tScope(kind)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={latId}>{t("fieldLatitude")}</FieldLabel>
              <Input
                id={latId}
                name="latitude"
                required
                type="number"
                step="0.000001"
                defaultValue={defaults?.latitude ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={lngId}>{t("fieldLongitude")}</FieldLabel>
              <Input
                id={lngId}
                name="longitude"
                required
                type="number"
                step="0.000001"
                defaultValue={defaults?.longitude ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={radiusId}>{t("fieldRadiusMeters")}</FieldLabel>
              <Input
                id={radiusId}
                name="radiusMeters"
                required
                type="number"
                min={1}
                max={50_000}
                defaultValue={defaults?.radiusMeters ?? 100}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={bufferId}>{t("fieldBufferMeters")}</FieldLabel>
              <Input
                id={bufferId}
                name="bufferMeters"
                type="number"
                min={0}
                max={5_000}
                defaultValue={defaults?.bufferMeters ?? 0}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={countryId}>{t("fieldCountryCode")}</FieldLabel>
              <Input
                id={countryId}
                name="countryCode"
                maxLength={2}
                placeholder="MY"
                defaultValue={defaults?.countryCode ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={legalId}>{t("fieldLegalEntityCode")}</FieldLabel>
              <Input
                id={legalId}
                name="legalEntityCode"
                maxLength={64}
                defaultValue={defaults?.legalEntityCode ?? ""}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor={notesId}>{t("fieldNotes")}</FieldLabel>
            <Textarea
              id={notesId}
              name="notes"
              rows={3}
              maxLength={2_000}
              defaultValue={defaults?.notes ?? ""}
            />
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
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GeofenceDeprecateButton({ geofenceId }: { geofenceId: string }) {
  const t = useTranslations("Dashboard.Hrm.Geolocation.geofences")
  const [state, formAction, pending] = useActionState<
    GeofenceMutationFormState | undefined,
    FormData
  >(deprecateGeofenceAction, undefined)
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="geofenceId" value={geofenceId} />
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("deprecating")}
          </>
        ) : (
          t("deprecateOpen")
        )}
      </Button>
      {!state?.ok && state?.errors?.form ? (
        <span className="text-xs text-destructive">{state.errors.form}</span>
      ) : null}
    </form>
  )
}
