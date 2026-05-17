import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { ContactRow } from "../types"

type ContactsListCopy = {
  eyebrow: string
  title: string
  description: string
  empty: string
  colName: string
  colEmail: string
  colCreated: string
  noEmail: string
}

export function buildContactsListSurfaceConfiguration(
  rows: readonly ContactRow[],
  copy: ContactsListCopy,
  options?: {
    requiresErpPermission?: ListSurfaceRendererConfigurationInput["requiresErpPermission"]
  }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: options?.requiresErpPermission,
    presentation: {
      variant: "table-only",
      tableDensity: "compact",
    },
    surface: {
      header: {
        eyebrow: copy.eyebrow,
        title: copy.title,
        description: copy.description,
      },
      columnsId: "contacts-directory",
      rowKey: "id",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "email", header: copy.colEmail },
      {
        id: "createdAt",
        header: copy.colCreated,
        cellKind: { kind: "date" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        name: row.name,
        email: row.email ?? copy.noEmail,
        createdAt: row.createdAt.toISOString(),
      },
    })),
  }
}
