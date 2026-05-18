import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"
import { toolsSignatureRequestPath } from "../../constants"

import type { SignatureRequestListRow } from "./signature-request.queries.server"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

export const SIGNATURE_REQUEST_LIST_SURFACE_ID = "tools-signature-requests"

type SignatureRequestListCopy = {
  orgSlug: string
  empty: string
  colKind: string
  colSubject: string
  colStatus: string
  colSent: string
  kindLabelFor: (kind: string) => string
  formatSentAt: (date: Date) => string
}

export function buildSignatureRequestListSurfaceConfiguration(
  rows: readonly SignatureRequestListRow[],
  copy: SignatureRequestListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: SIGNATURE_REQUEST_LIST_SURFACE_ID },
      columnsId: SIGNATURE_REQUEST_LIST_SURFACE_ID,
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      {
        id: "kind",
        header: copy.colKind,
        cellKind: { kind: "link" },
      },
      { id: "subject", header: copy.colSubject },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "sent",
        header: copy.colSent,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        kind: copy.kindLabelFor(row.kind),
        subject: row.subjectId,
        status: row.derivedStatus,
        sent: row.sentAt ? copy.formatSentAt(row.sentAt) : "—",
      },
      rowHref: toolsSignatureRequestPath(copy.orgSlug, row.publicSlug),
      linkColumnId: "kind",
    })),
  }
}
