"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { useTranslations } from "next-intl"

import {
  cancelInvitationAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  type OrgAdminActionState,
} from "../actions/members.actions"
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Spinner } from "#components/ui/spinner"

type MemberRow = {
  id: string
  userId: string
  name: string | null
  email: string
  role: string
}

type InvitationRow = {
  id: string
  email: string
  role: string | null
  status: string
  expiresAt: Date
}

function SubmitButton({
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

function ActionMessage({ state }: { state: OrgAdminActionState }) {
  if (!state || !state.ok) return null
  if (!state.message) return null
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

function CancelInvitationButton({ invitationId }: { invitationId: string }) {
  const t = useTranslations("OrgAdmin.pending")
  const [state, formAction] = useActionState(cancelInvitationAction, null)
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="invitationId" value={invitationId} />
      <SubmitButton
        label={t("cancel")}
        pendingLabel={t("cancelling")}
        variant="outline"
      />
      <ActionError state={state} />
    </form>
  )
}

function UpdateMemberRoleForm({ m }: { m: MemberRow }) {
  const tInvite = useTranslations("OrgAdmin.invite")
  const tList = useTranslations("OrgAdmin.memberList")
  const [state, formAction] = useActionState(updateMemberRoleAction, null)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="memberId" value={m.id} />
        <input type="hidden" name="targetUserId" value={m.userId} />
        <select
          name="role"
          defaultValue={m.role}
          aria-label={tInvite("labelRole")}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <option value="member">{tInvite("roleMember")}</option>
          <option value="admin">{tInvite("roleAdmin")}</option>
          <option value="owner">{tInvite("roleOwner")}</option>
        </select>
        <SubmitButton
          label={tList("updateRole")}
          pendingLabel={tList("saving")}
          variant="secondary"
        />
      </div>
      <ActionError state={state} />
      <ActionMessage state={state} />
    </form>
  )
}

function RemoveMemberForm({ m }: { m: MemberRow }) {
  const t = useTranslations("OrgAdmin.memberList")
  const [state, formAction] = useActionState(removeMemberAction, null)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="memberId" value={m.id} />
      <input type="hidden" name="targetUserId" value={m.userId} />
      <SubmitButton
        label={t("remove")}
        pendingLabel={t("removing")}
        variant="destructive"
      />
      <ActionError state={state} />
      <ActionMessage state={state} />
    </form>
  )
}

/**
 * Narrow structural type — only the three role-key calls made by `localizeRole`.
 *
 * Avoids `ReturnType<typeof useTranslations<"OrgAdmin.invite">>` which forces
 * TypeScript to instantiate the full next-intl message type on every check of
 * this file.  The three literal keys are valid within the `"OrgAdmin.invite"`
 * namespace, so the narrowed `t` from `useTranslations("OrgAdmin.invite")` is
 * structurally assignable here without expanding the whole message graph.
 */
type LocalizeRoleT = (key: "roleOwner" | "roleAdmin" | "roleMember") => string

function localizeRole(role: string, tInvite: LocalizeRoleT): string {
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

export function OrganizationAdminClient({
  members,
  invitations,
  currentUserId,
}: {
  members: MemberRow[]
  invitations: InvitationRow[]
  currentUserId: string
}) {
  const tInvite = useTranslations("OrgAdmin.invite")
  const tPending = useTranslations("OrgAdmin.pending")
  const tList = useTranslations("OrgAdmin.memberList")
  const [inviteState, inviteFormAction] = useActionState(
    inviteMemberAction,
    null
  )

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{tInvite("title")}</h2>
        <form action={inviteFormAction} className="flex flex-col gap-3">
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
            <div className="grid w-full gap-2 sm:w-40">
              <Label htmlFor="invite-role">{tInvite("labelRole")}</Label>
              <select
                id="invite-role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue="member"
              >
                <option value="member">{tInvite("roleMember")}</option>
                <option value="admin">{tInvite("roleAdmin")}</option>
              </select>
            </div>
            <SubmitButton
              label={tInvite("submit")}
              pendingLabel={tInvite("submitting")}
            />
          </div>
          <ActionError state={inviteState} />
          <ActionMessage state={inviteState} />
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{tPending("title")}</h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tPending("empty")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">{inv.email}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    {tPending("metaRoleAndExpiry", {
                      role: localizeRole(inv.role ?? "member", tInvite),
                      expiresAt: inv.expiresAt,
                    })}
                  </span>
                </div>
                <CancelInvitationButton invitationId={inv.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{tList("title")}</h2>
        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-3 px-3 py-3 text-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <span className="font-medium">{m.name ?? m.email}</span>
                <div className="text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {m.userId === currentUserId ? (
                  <span className="text-xs text-muted-foreground capitalize">
                    {tList("selfBadge", {
                      role: localizeRole(m.role, tInvite),
                    })}
                  </span>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <UpdateMemberRoleForm m={m} />
                    <RemoveMemberForm m={m} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
