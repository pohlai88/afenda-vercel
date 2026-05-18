"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import {
  cancelInvitationAction,
  removeMemberAction,
} from "../actions/members.actions"
import { Button } from "#components2/ui/button"
import { Spinner } from "#components2/ui/spinner"

export function OrgAdminSubmitButton({
  label,
  pendingLabel,
  variant = "default",
}: {
  label: string
  pendingLabel: string
  variant?: "default" | "destructive" | "outline" | "secondary"
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

export function OrgAdminCancelInvitationButton({
  invitationId,
}: {
  invitationId: string
}) {
  const t = useTranslations("OrgAdmin.pending")
  const [state, formAction] = useActionState(cancelInvitationAction, null)
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="invitationId" value={invitationId} />
      <OrgAdminSubmitButton
        label={t("cancel")}
        pendingLabel={t("cancelling")}
        variant="outline"
      />
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </form>
  )
}

export function OrgAdminRemoveMemberButton({
  memberId,
  targetUserId,
}: {
  memberId: string
  targetUserId: string
}) {
  const t = useTranslations("OrgAdmin.memberList")
  const [state, formAction] = useActionState(removeMemberAction, null)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <OrgAdminSubmitButton
        label={t("remove")}
        pendingLabel={t("removing")}
        variant="destructive"
      />
      {state && !state.ok ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

export function localizeOrgAdminRole(
  role: string,
  tInvite: (key: "roleOwner" | "roleAdmin" | "roleMember") => string
): string {
  switch (role) {
    case "owner":
      return tInvite("roleOwner")
    case "admin":
      return tInvite("roleAdmin")
    case "member":
      return tInvite("roleMember")
    default:
      return role
  }
}
