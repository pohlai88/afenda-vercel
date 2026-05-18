import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"
import type { OrganizationIamAuditRow } from "#lib/auth"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type OrgAuditListCopy = {
  empty: string
  colWhen: string
  colOrigin: string
  colAction: string
  colActor: string
  colResource: string
  colDetails: string
  noValue: string
  formatWhen: (date: Date) => string
}

export function buildOrgAuditListSurfaceConfiguration(
  rows: readonly OrganizationIamAuditRow[],
  copy: OrgAuditListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "org-admin-audit-events" },
      columnsId: "org-admin-audit-events",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      {
        id: "when",
        header: copy.colWhen,
        cellKind: { kind: "datetime" },
      },
      {
        id: "origin",
        header: copy.colOrigin,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "action", header: copy.colAction },
      { id: "actor", header: copy.colActor },
      { id: "resource", header: copy.colResource },
      { id: "details", header: copy.colDetails },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        when: copy.formatWhen(row.createdAt),
        origin: row.auditOrigin,
        action: row.action,
        actor: row.actorEmail ?? row.actorUserId ?? copy.noValue,
        resource:
          row.resourceType && row.resourceId
            ? `${row.resourceType}:${row.resourceId}`
            : copy.noValue,
        details: row.metadataSummary ?? row.path ?? copy.noValue,
      },
    })),
  }
}
