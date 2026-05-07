"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"

import {
  deleteOrgEventEndpoint,
  pingOrgEventEndpoint,
  rotateOrgEventEndpointSecret,
  type EndpointActionState,
  type EndpointPingActionState,
} from "../actions/integrations-endpoints.actions"
import type { OrgEventDeliverySummary, OrgEventEndpointSummary } from "../types"

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

export function IntegrationsEndpointRow({
  endpoint,
  recentDeliveries,
}: {
  endpoint: OrgEventEndpointSummary
  recentDeliveries: readonly OrgEventDeliverySummary[]
}) {
  const t = useTranslations("OrgAdmin.integrations.endpoints")
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          <p className="font-medium">{endpoint.name}</p>
          <p className="text-xs break-all text-muted-foreground">
            {endpoint.url}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("statusEnabled", { enabled: endpoint.enabled ? "yes" : "no" })}
            {" · "}
            {t("statusEvents", { count: endpoint.events.length })}
            {" · "}
            <span className="font-mono">{endpoint.signatureVersion}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <PingForm endpointId={endpoint.id} />
          <RotateForm endpointId={endpoint.id} />
          <DeleteForm endpointId={endpoint.id} />
        </div>
      </div>

      {recentDeliveries.length > 0 ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {t("recentTitle")}
          </p>
          <ul className="space-y-1 text-xs">
            {recentDeliveries.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-2 font-mono"
              >
                <span className="text-muted-foreground">
                  {d.createdAt.toISOString().slice(0, 19)}Z
                </span>
                <span>{d.eventType}</span>
                <span
                  className={
                    d.state === "delivered"
                      ? "text-emerald-600"
                      : d.state === "failed"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }
                >
                  {d.state}
                </span>
                {d.httpStatus ? (
                  <span className="text-muted-foreground">
                    HTTP {d.httpStatus}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
