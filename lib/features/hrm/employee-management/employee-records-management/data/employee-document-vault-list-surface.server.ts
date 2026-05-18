import "server-only"

import {
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import type { HrmDocumentSummary } from "../../../types"

const DOCUMENT_READ_PERMISSION = {
  module: "hrm" as const,
  object: "document" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type EmployeeDocumentVaultListCopy = {
  empty: string
  colTitle: string
  colType: string
  colUploaded: string
  typeLabelFor: (documentType: string) => string
  formatUploadedAt: (value: Date) => string
}

export function buildEmployeeDocumentVaultListSurfaceConfiguration(
  documents: readonly HrmDocumentSummary[],
  copy: EmployeeDocumentVaultListCopy,
  context: { canDownload: boolean }
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: DOCUMENT_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: "hrm-employee-document-vault" },
      columnsId: "hrm-employee-document-vault",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      {
        id: "type",
        header: copy.colType,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "uploaded",
        header: copy.colUploaded,
        cellKind: { kind: "datetime" },
      },
    ],
    rows: documents.map((doc) => ({
      id: doc.id,
      cells: {
        title: doc.title,
        type: copy.typeLabelFor(doc.documentType),
        uploaded: copy.formatUploadedAt(doc.uploadedAt),
      },
      trailingAction: resolveListSurfaceRowTrailingAction({
        visible: context.canDownload,
        allowed: context.canDownload,
      }),
    })),
  }
}
