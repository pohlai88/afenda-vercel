import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { buildPlatformAdminUsersListSurfaceConfiguration } from "../data/platform-admin-users-list-surface.server"
import type { PlatformAdminUserSummary } from "../types"

import { PlatformAdminUserActions } from "./platform-admin-user-actions.client"

type PlatformAdminUsersListSectionProps = {
  users: readonly PlatformAdminUserSummary[]
  currentUserId: string
}

export async function PlatformAdminUsersListSection({
  users,
  currentUserId,
}: PlatformAdminUsersListSectionProps) {
  const t = await getTranslations("PlatformAdmin.users")
  const listConfiguration = buildPlatformAdminUsersListSurfaceConfiguration(
    users,
    {
      empty: t("empty"),
      colEmail: t("colEmail"),
      colName: t("colName"),
      colRole: t("colRole"),
      colStatus: t("colStatus"),
      nameless: t("nameless"),
      bannedTag: t("bannedTag"),
    }
  )
  const userById = new Map(users.map((user) => [user.id, user]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="platform-admin:users"
      resolveConfiguredPermission={false}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const user = userById.get(surfaceRow.id)
          const trailingAction = surfaceRow.trailingAction
          if (!user || !isListSurfaceTrailingActionRenderable(trailingAction)) {
            return null
          }
          return (
            <GovernedTrailingActionSlot trailingAction={trailingAction}>
              <PlatformAdminUserActions
                user={user}
                isSelf={user.id === currentUserId}
              />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
