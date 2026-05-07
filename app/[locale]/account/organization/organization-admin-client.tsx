"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import type { OrgAdminActionState } from "./organization-actions"
import {
  cancelInvitationAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "./organization-actions"
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
  if (!state || state.ok) return null
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not complete action</AlertTitle>
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}

function CancelInvitationButton({ invitationId }: { invitationId: string }) {
  const [state, formAction] = useActionState(cancelInvitationAction, null)
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="invitationId" value={invitationId} />
      <SubmitButton
        label="Cancel invite"
        pendingLabel="Cancelling…"
        variant="outline"
      />
      <ActionError state={state} />
    </form>
  )
}

function UpdateMemberRoleForm({ m }: { m: MemberRow }) {
  const [state, formAction] = useActionState(updateMemberRoleAction, null)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="memberId" value={m.id} />
        <input type="hidden" name="targetUserId" value={m.userId} />
        <select
          name="role"
          defaultValue={m.role}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <SubmitButton
          label="Update role"
          pendingLabel="Saving…"
          variant="secondary"
        />
      </div>
      <ActionError state={state} />
      <ActionMessage state={state} />
    </form>
  )
}

function RemoveMemberForm({ m }: { m: MemberRow }) {
  const [state, formAction] = useActionState(removeMemberAction, null)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="memberId" value={m.id} />
      <input type="hidden" name="targetUserId" value={m.userId} />
      <SubmitButton
        label="Remove"
        pendingLabel="Removing…"
        variant="destructive"
      />
      <ActionError state={state} />
      <ActionMessage state={state} />
    </form>
  )
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
  const [inviteState, inviteFormAction] = useActionState(
    inviteMemberAction,
    null
  )

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Invite member</h2>
        <form action={inviteFormAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                autoComplete="off"
                required
                placeholder="colleague@company.com"
              />
            </div>
            <div className="grid w-full gap-2 sm:w-40">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue="member"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <SubmitButton label="Send invite" pendingLabel="Sending…" />
          </div>
          <ActionError state={inviteState} />
          <ActionMessage state={inviteState} />
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Pending invitations</h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">None pending.</p>
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
                    {inv.role ?? "member"} · expires{" "}
                    {inv.expiresAt.toLocaleDateString()}
                  </span>
                </div>
                <CancelInvitationButton invitationId={inv.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Members</h2>
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
                    {m.role} (you)
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
