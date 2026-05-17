"use client"

import { UserPlusIcon } from "lucide-react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Separator } from "#components2/ui/separator"
import { Spinner } from "#components2/ui/spinner"

import type { AcceptInviteActionState } from "./accept-invitation-actions"
import {
  acceptOrganizationInvitationAction,
  rejectOrganizationInvitationAction,
} from "./accept-invitation-actions"

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
    <AuthPageFrame>
      <Card className="w-full border-border/80 shadow-elevation-1">
        <CardHeader className="space-y-2 pb-4">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <UserPlusIcon className="size-5 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-xl tracking-tight">
            Organization invitation
          </CardTitle>
          <CardDescription>
            You have been invited to join an organization. Accept to join on
            this account, or reject to decline.
          </CardDescription>
        </CardHeader>
        {acceptState !== null || rejectState !== null ? (
          <CardContent className="space-y-3">
            <FormError state={acceptState} />
            <FormError state={rejectState} />
          </CardContent>
        ) : null}
        <Separator />
        <CardFooter className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-end">
          <form action={rejectAction}>
            <input type="hidden" name="invitationId" value={invitationId} />
            <SubmitButton
              label="Reject"
              pendingLabel="Rejecting…"
              variant="outline"
            />
          </form>
          <form action={acceptAction}>
            <input type="hidden" name="invitationId" value={invitationId} />
            <SubmitButton label="Accept invitation" pendingLabel="Accepting…" />
          </form>
        </CardFooter>
      </Card>
    </AuthPageFrame>
  )
}
