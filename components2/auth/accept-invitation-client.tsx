"use client"

import { UserPlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import {
  acceptOrganizationInvitationAction,
  rejectOrganizationInvitationAction,
  type AcceptInviteActionState,
} from "#features/iam-profile/client"
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

function FormError({
  state,
  title,
}: {
  state: AcceptInviteActionState
  title: string
}) {
  if (state === null) return null
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}

export function AcceptInvitationClient({
  invitationId,
}: {
  invitationId: string
}) {
  const t = useTranslations("AcceptInvitation.form")
  const [acceptState, acceptAction] = useActionState(
    acceptOrganizationInvitationAction,
    null
  )
  const [rejectState, rejectAction] = useActionState(
    rejectOrganizationInvitationAction,
    null
  )

  return (
    <Card className="w-full border-border/80 shadow-elevation-1">
      <CardHeader className="space-y-2 pb-4">
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10">
          <UserPlusIcon className="size-5 text-primary" aria-hidden />
        </div>
        <CardTitle className="text-xl tracking-tight">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      {acceptState !== null || rejectState !== null ? (
        <CardContent className="space-y-3">
          <FormError state={acceptState} title={t("errorTitle")} />
          <FormError state={rejectState} title={t("errorTitle")} />
        </CardContent>
      ) : null}
      <Separator />
      <CardFooter className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-end">
        <form action={rejectAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton
            label={t("reject")}
            pendingLabel={t("rejecting")}
            variant="outline"
          />
        </form>
        <form action={acceptAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton label={t("accept")} pendingLabel={t("accepting")} />
        </form>
      </CardFooter>
    </Card>
  )
}
