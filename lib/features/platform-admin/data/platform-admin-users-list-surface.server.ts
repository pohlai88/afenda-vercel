import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { PlatformAdminUserSummary } from "../types"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type PlatformAdminUsersListCopy = {
  empty: string
  colEmail: string
  colName: string
  colRole: string
  colStatus: string
  nameless: string
  bannedTag: string
}

export function buildPlatformAdminUsersListSurfaceConfiguration(
  users: readonly PlatformAdminUserSummary[],
  copy: PlatformAdminUsersListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "platform-admin-users" },
      columnsId: "platform-admin-users",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "email", header: copy.colEmail },
      { id: "name", header: copy.colName },
      { id: "role", header: copy.colRole },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "attention" },
      },
    ],
    rows: users.map((user) => ({
      id: user.id,
      cells: {
        email: user.email,
        name: user.name || copy.nameless,
        role: user.role ?? "—",
        status: user.banned ? copy.bannedTag : "active",
      },
      trailingAction: { state: "ready" as const },
    })),
  }
}
