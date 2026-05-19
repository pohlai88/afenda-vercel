"use client"

import { useActionState } from "react"

import { useTranslations } from "next-intl"

import {
  inviteMemberAction,
  type OrgAdminActionState,
} from "../actions/members.actions"
import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import { OrgAdminSubmitButton } from "./organization-admin-member-actions.client"

function ActionMessage({ state }: { state: OrgAdminActionState }) {
  if (!state || !state.ok || !state.message) return null
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {state.message}
    </p>
  )
}

function ActionError({ state }: { state: OrgAdminActionState }) {
  const t = useTranslations("OrgAdmin.client")
  if (!state || state.ok) return null
  return (
    <Alert variant="destructive">
      <AlertTitle>{t("errorTitle")}</AlertTitle>
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}

export function OrganizationAdminInviteSection() {
  const tInvite = useTranslations("OrgAdmin.invite")
  const [inviteState, inviteFormAction] = useActionState(
    inviteMemberAction,
    null
  )

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{tInvite("title")}</h2>
      <form action={inviteFormAction} className="flex flex-col gap-3">
        <input type="hidden" name="role" value="member" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="invite-email">{tInvite("labelEmail")}</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              placeholder={tInvite("placeholderEmail")}
            />
          </div>
          <OrgAdminSubmitButton
            label={tInvite("submit")}
            pendingLabel={tInvite("submitting")}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Tenant governance and ERP RBAC are now managed from the Access
          surface. Invitations create members only.
        </p>
        <ActionError state={inviteState} />
        <ActionMessage state={inviteState} />
      </form>
    </section>
  )
}
