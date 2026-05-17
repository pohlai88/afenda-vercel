"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Spinner } from "#components2/ui/spinner"

import {
  createOrgEventEndpoint,
  type EndpointActionState,
} from "../actions/integrations-endpoints.actions"
import { ORG_EVENT_TYPES } from "../constants"

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="size-3.5" />
          {pendingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  )
}

/**
 * Create-form for new outbound endpoints. After a successful submit the
 * server responds with a one-shot `signingKey` that is rendered inline and
 * cannot be retrieved again.
 */
export function IntegrationsEndpointForm() {
  const t = useTranslations("OrgAdmin.integrations.endpoints")
  const [state, formAction] = useActionState<EndpointActionState, FormData>(
    createOrgEventEndpoint,
    null
  )
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  function toggleEvent(value: string) {
    setSelectedEvents((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="events" value={selectedEvents.join(",")} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="endpoint-name">{t("formNameLabel")}</Label>
          <Input
            id="endpoint-name"
            name="name"
            type="text"
            autoComplete="off"
            required
            placeholder={t("formNamePlaceholder")}
          />
          {state && !state.ok && state.fieldErrors?.name ? (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endpoint-url">{t("formUrlLabel")}</Label>
          <Input
            id="endpoint-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            required
            placeholder="https://example.com/webhooks"
          />
          {state && !state.ok && state.fieldErrors?.url ? (
            <p className="text-xs text-destructive">{state.fieldErrors.url}</p>
          ) : null}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">
          {t("formEventsLegend")}
        </legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {ORG_EVENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedEvents.includes(type)}
                onChange={() => toggleEvent(type)}
                className="size-4"
              />
              <span className="font-mono text-xs">{type}</span>
            </label>
          ))}
        </div>
        {state && !state.ok && state.fieldErrors?.events ? (
          <p className="text-xs text-destructive">{state.fieldErrors.events}</p>
        ) : null}
      </fieldset>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton
          label={t("formSubmit")}
          pendingLabel={t("formSubmitting")}
        />
      </div>

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertTitle>{t("formErrorTitle")}</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state && state.ok && state.signingKey ? (
        <Alert>
          <AlertTitle>{t("signingKeyTitle")}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{t("signingKeyDescription")}</p>
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
              {state.signingKey}
            </code>
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
