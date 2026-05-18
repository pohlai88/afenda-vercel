import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { PlatformAdminOrganizationSummary } from "../types"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type PlatformAdminOrganizationsListCopy = {
  empty: string
  colName: string
  colSlug: string
  colMembers: string
  colCreated: string
  formatCreatedAt: (date: Date) => string
}

export function buildPlatformAdminOrganizationsListSurfaceConfiguration(
  organizations: readonly PlatformAdminOrganizationSummary[],
  copy: PlatformAdminOrganizationsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "platform-admin-organizations" },
      columnsId: "platform-admin-organizations",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "slug", header: copy.colSlug },
      { id: "members", header: copy.colMembers, align: "end" },
      {
        id: "created",
        header: copy.colCreated,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: organizations.map((organization) => ({
      id: organization.id,
      cells: {
        name: organization.name,
        slug: organization.slug,
        members: String(organization.memberCount),
        created: copy.formatCreatedAt(organization.createdAt),
      },
      trailingAction: { state: "ready" as const },
    })),
  }
}
