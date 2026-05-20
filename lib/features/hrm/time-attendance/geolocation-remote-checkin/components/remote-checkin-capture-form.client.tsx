"use client"

import { useActionState, useId, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, MapPin } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { recordRemoteCheckinAction } from "../actions/remote-checkin-capture.actions"
import type { RemoteCheckinRecordFormState } from "../../../types"

import { useFormSuccess } from "../../../_internal-cross-cutting/use-form-success.client"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

type RemoteCheckinCaptureFormProps = {
  readonly orgSlug: string
  /** When provided, the form submits for a different employee (HR / manager on-behalf). */
  readonly defaultEmployeeId?: string
  readonly geofenceChoices?: ReadonlyArray<{
    id: string
    code: string
    label: string
  }>
  readonly onSuccess?: () => void
}

const EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
] as const

function defaultLocalIso(): string {
  const now = new Date()
  const offsetMinutes = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offsetMinutes * 60_000)
  return local.toISOString().slice(0, 16)
}

export function RemoteCheckinCaptureForm({
  orgSlug,
  defaultEmployeeId,
  geofenceChoices = [],
  onSuccess,
}: RemoteCheckinCaptureFormProps) {
  const t = useTranslations("Dashboard.Hrm.Geolocation")
  const tEvent = useTranslations("Dashboard.Hrm.Geolocation.eventTypeLabels")
  const [state, formAction, pending] = useActionState<
    RemoteCheckinRecordFormState | undefined,
    FormData
  >(recordRemoteCheckinAction, undefined)

  const eventTypeId = useId()
  const occurredAtId = useId()
  const latId = useId()
  const lngId = useId()
  const accuracyId = useId()
  const deviceId = useId()
  const remoteLocationId = useId()
  const geofenceId = useId()

  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [accuracy, setAccuracy] = useState("")
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "pending" | "ready" | "denied"
  >("idle")

  useFormSuccess(state, onSuccess, {
    when: (result) =>
      result.ok && "outcome" in result && result.outcome === "approved",
  })

  const fieldErrors = useMemo(() => {
    if (!state || state.ok) return null
    return state.errors
  }, [state])

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("denied")
      return
    }
    setGeoStatus("pending")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
        setAccuracy(Math.round(position.coords.accuracy).toString())
        setGeoStatus("ready")
      },
      () => {
        setGeoStatus("denied")
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 }
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      {defaultEmployeeId ? (
        <input type="hidden" name="employeeId" value={defaultEmployeeId} />
      ) : null}

      {state?.ok && state.outcome === "pending_exception" ? (
        <Alert>
          <AlertTitle>{t("capture.submitSuccessTitle")}</AlertTitle>
          <AlertDescription>
            {t("capture.submitSuccessException")}
          </AlertDescription>
        </Alert>
      ) : null}
      {state?.ok && state.outcome === "approved" ? (
        <Alert>
          <AlertTitle>{t("capture.submitSuccessTitle")}</AlertTitle>
          <AlertDescription>
            {t("capture.submitSuccessVerified")}
          </AlertDescription>
        </Alert>
      ) : null}

      {fieldErrors?.form ? (
        <Alert variant="destructive">
          <AlertTitle>{t("capture.submitFailedTitle")}</AlertTitle>
          <AlertDescription>{fieldErrors.form}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={eventTypeId}>
          {t("capture.fieldEventType")}
        </FieldLabel>
        <select
          id={eventTypeId}
          name="eventType"
          required
          defaultValue="clock_in"
          className={SELECT_CLASS}
          aria-invalid={Boolean(fieldErrors?.eventType)}
        >
          {EVENT_TYPES.map((option) => (
            <option key={option} value={option}>
              {tEvent(option)}
            </option>
          ))}
        </select>
        {fieldErrors?.eventType ? (
          <FieldError>{fieldErrors.eventType}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={occurredAtId}>
          {t("capture.fieldOccurredAt")}
        </FieldLabel>
        <Input
          id={occurredAtId}
          name="occurredAtIso"
          type="datetime-local"
          required
          defaultValue={defaultLocalIso()}
        />
        <FieldDescription>{t("capture.fieldOccurredAtHint")}</FieldDescription>
        {fieldErrors?.occurredAt ? (
          <FieldError>{fieldErrors.occurredAt}</FieldError>
        ) : null}
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={latId}>{t("capture.fieldLatitude")}</FieldLabel>
          <Input
            id={latId}
            name="latitude"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            required
            inputMode="decimal"
            placeholder="0.000000"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={lngId}>{t("capture.fieldLongitude")}</FieldLabel>
          <Input
            id={lngId}
            name="longitude"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            required
            inputMode="decimal"
            placeholder="0.000000"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={accuracyId}>
            {t("capture.fieldGpsAccuracyMeters")}
          </FieldLabel>
          <Input
            id={accuracyId}
            name="gpsAccuracyMeters"
            value={accuracy}
            onChange={(event) => setAccuracy(event.target.value)}
            type="number"
            min={0}
            step={1}
            required
          />
        </Field>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={requestLocation}
        className="self-start"
        disabled={geoStatus === "pending"}
      >
        <MapPin className="size-4" data-icon="inline-start" aria-hidden />
        {geoStatus === "pending"
          ? t("capture.locationPending")
          : t("capture.useCurrentLocation")}
      </Button>
      {geoStatus === "denied" ? (
        <Alert variant="destructive">
          <AlertDescription>{t("capture.locationDenied")}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor={deviceId}>{t("capture.fieldDeviceId")}</FieldLabel>
        <Input id={deviceId} name="deviceId" required maxLength={120} />
        {fieldErrors?.deviceId ? (
          <FieldError>{fieldErrors.deviceId}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={remoteLocationId}>
          {t("capture.fieldRemoteLocation")}
        </FieldLabel>
        <Input
          id={remoteLocationId}
          name="remoteLocationLabel"
          maxLength={256}
          placeholder={t("capture.fieldRemoteLocationPlaceholder")}
        />
      </Field>

      {geofenceChoices.length > 0 ? (
        <Field>
          <FieldLabel htmlFor={geofenceId}>
            {t("capture.fieldGeofence")}
          </FieldLabel>
          <select
            id={geofenceId}
            name="geofenceId"
            defaultValue=""
            className={SELECT_CLASS}
          >
            <option value="">{t("capture.fieldGeofencePlaceholder")}</option>
            {geofenceChoices.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} · {row.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-icon="inline-start"
              aria-hidden
            />
            {t("capture.submitting")}
          </>
        ) : (
          t("capture.submit")
        )}
      </Button>
    </form>
  )
}
