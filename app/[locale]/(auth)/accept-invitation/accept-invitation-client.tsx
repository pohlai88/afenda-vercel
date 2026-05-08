"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import type { AcceptInviteActionState } from "./accept-invitation-actions"
import {
  acceptOrganizationInvitationAction,
  rejectOrganizationInvitationAction,
} from "./accept-invitation-actions"
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Spinner } from "#components/ui/spinner"

function SubmitButton({
  label,
  pendingLabel,
  variant = "default",
}: {
  label: string
  pendingLabel: string
  variant?: "default" | "outline"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="size-4" />
          {pendingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  )
}

function FormError({ state }: { state: AcceptInviteActionState }) {
  if (state === null) return null
  return (
    <Alert variant="destructive">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}

export function AcceptInvitationClient({
  invitationId,
}: {
  invitationId: string
}) {
  const [acceptState, acceptAction] = useActionState(
    acceptOrganizationInvitationAction,
    null
  )
  const [rejectState, rejectAction] = useActionState(
    rejectOrganizationInvitationAction,
    null
  )

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Organization invitation
      </h1>
      <p className="text-sm text-muted-foreground">
        Accept to join the organization on this account, or reject to decline.
      </p>
      <FormError state={acceptState} />
      <FormError state={rejectState} />
      <div className="flex flex-wrap gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton label="Accept" pendingLabel="Accepting…" />
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton
            label="Reject"
            pendingLabel="Rejecting…"
            variant="outline"
          />
        </form>
      </div>
    </div>
  )
}
