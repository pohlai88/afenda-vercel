"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"

import {
  banUserAction,
  setUserRoleAction,
  unbanUserAction,
  type PlatformAdminUserActionState,
} from "../actions/users.actions"
import type { PlatformAdminUserSummary } from "../types"

type Props = {
  users: readonly PlatformAdminUserSummary[]
  currentUserId: string
}

export function PlatformAdminUsersTable({ users, currentUserId }: Props) {
  const t = useTranslations("PlatformAdmin.users")

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>
  }

  return (
    <ul className="divide-y divide-border rounded-md border">
      {users.map((user) => (
        <PlatformAdminUserRow
          key={user.id}
          user={user}
          isSelf={user.id === currentUserId}
        />
      ))}
    </ul>
  )
}

function PlatformAdminUserRow({
  user,
  isSelf,
}: {
  user: PlatformAdminUserSummary
  isSelf: boolean
}) {
  const t = useTranslations("PlatformAdmin.users")
  const [roleState, roleAction, rolePending] = useActionState<
    PlatformAdminUserActionState,
    FormData
  >(setUserRoleAction, null)
  const [banState, banAction, banPending] = useActionState<
    PlatformAdminUserActionState,
    FormData
  >(banUserAction, null)
  const [unbanState, unbanAction, unbanPending] = useActionState<
    PlatformAdminUserActionState,
    FormData
  >(unbanUserAction, null)

  const isAdmin = user.role === "admin"
  const nextRole = isAdmin ? "user" : "admin"

  const lastError =
    (roleState && !roleState.ok && roleState.error) ||
    (banState && !banState.ok && banState.error) ||
    (unbanState && !unbanState.ok && unbanState.error) ||
    null

  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{user.email}</p>
        <p className="truncate text-muted-foreground">
          {user.name || t("nameless")}
          {user.role ? ` · ${user.role}` : ""}
          {user.banned ? ` · ${t("bannedTag")}` : ""}
        </p>
        {lastError ? (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {lastError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form action={roleAction}>
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="role" value={nextRole} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={rolePending || isSelf}
            title={isSelf ? t("disabledSelf") : undefined}
          >
            {isAdmin ? t("makeUser") : t("makeAdmin")}
          </Button>
        </form>
        {user.banned ? (
          <form action={unbanAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={unbanPending}
            >
              {t("unban")}
            </Button>
          </form>
        ) : (
          <form action={banAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={banPending || isSelf}
              title={isSelf ? t("disabledSelf") : undefined}
            >
              {t("ban")}
            </Button>
          </form>
        )}
      </div>
    </li>
  )
}
