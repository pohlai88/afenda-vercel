"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"

import {
  banUserAction,
  setUserRoleAction,
  unbanUserAction,
  type PlatformAdminUserActionState,
} from "../actions/users.actions"
import type { PlatformAdminUserSummary } from "../types"

type PlatformAdminUserActionsProps = {
  user: PlatformAdminUserSummary
  isSelf: boolean
}

export function PlatformAdminUserActions({
  user,
  isSelf,
}: PlatformAdminUserActionsProps) {
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
    <div className="flex min-w-[14rem] flex-col gap-2">
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
      {lastError ? (
        <p className="text-xs text-destructive" role="alert">
          {lastError}
        </p>
      ) : null}
    </div>
  )
}
