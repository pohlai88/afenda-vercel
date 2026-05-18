"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Spinner } from "#components2/ui/spinner"

import {
  deleteOrgEventEndpoint,
  pingOrgEventEndpoint,
  rotateOrgEventEndpointSecret,
  type EndpointActionState,
  type EndpointPingActionState,
} from "../actions/integrations-endpoints.actions"

function SubmitIconButton({
  label,
  pendingLabel,
  variant = "outline",
}: {
  label: string
  pendingLabel: string
  variant?: "default" | "outline" | "destructive" | "secondary"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
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

function PingForm({ endpointId }: { endpointId: string }) {
  const t = useTranslations("OrgAdmin.integrations.endpoints")
  const [state, action] = useActionState<EndpointPingActionState, FormData>(
    pingOrgEventEndpoint,
    null
  )
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="endpointId" value={endpointId} />
      <SubmitIconButton label={t("ping")} pendingLabel={t("pinging")} />
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state && state.ok ? (
        <p className="text-xs text-muted-foreground">
          {t("pingResult", {
            state: state.state,
            httpStatus: state.httpStatus ?? "—",
            durationMs: state.durationMs,
          })}
        </p>
      ) : null}
    </form>
  )
}

function RotateForm({ endpointId }: { endpointId: string }) {
  const t = useTranslations("OrgAdmin.integrations.endpoints")
  const [state, action] = useActionState<EndpointActionState, FormData>(
    rotateOrgEventEndpointSecret,
    null
  )
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="endpointId" value={endpointId} />
      <SubmitIconButton label={t("rotate")} pendingLabel={t("rotating")} />
      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertTitle>{t("rotateErrorTitle")}</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state && state.ok && state.signingKey ? (
        <Alert>
          <AlertTitle>{t("signingKeyTitle")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
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

function DeleteForm({ endpointId }: { endpointId: string }) {
  const t = useTranslations("OrgAdmin.integrations.endpoints")
  const [state, action] = useActionState<EndpointActionState, FormData>(
    deleteOrgEventEndpoint,
    null
  )
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="endpointId" value={endpointId} />
      <SubmitIconButton
        label={t("delete")}
        pendingLabel={t("deleting")}
        variant="destructive"
      />
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

export function IntegrationsEndpointActions({
  endpointId,
}: {
  endpointId: string
}) {
  return (
    <div className="flex min-w-[10rem] flex-wrap items-start gap-2">
      <PingForm endpointId={endpointId} />
      <RotateForm endpointId={endpointId} />
      <DeleteForm endpointId={endpointId} />
    </div>
  )
}
