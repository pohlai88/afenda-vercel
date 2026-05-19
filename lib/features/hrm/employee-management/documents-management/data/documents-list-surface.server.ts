import "server-only"

import {
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import {
  formatHrmDocumentSize,
  isHrmDocumentClassification,
  isHrmDocumentType,
  isHrmDocumentVerificationStatus,
  shortenPayloadHash,
} from "./hrm-document-display.shared"
import type { OrgHrmDocumentRow } from "./hrm-document.queries.server"

const DOCUMENTS_READ_PERMISSION = {
  module: "hrm" as const,
  object: "document" as const,
  function: "read" as const,
}

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

export const DOCUMENTS_LIST_SURFACE_ID = "hrm-documents-library"

type DocumentsListCopy = {
  empty: string
  colTitle: string
  colType: string
  colEmployee: string
  colClassification: string
  colVerification: string
  colSize: string
  colUploadedAt: string
  colHash: string
  noEmployeeBadge: string
  typeLabelFor: (documentType: string) => string
  classificationLabelFor: (classification: string) => string
  verificationLabelFor: (status: string) => string
  formatUploadedAt: (date: Date) => string
}

export type DocumentsListContext = {
  showActionsColumn: boolean
  canDownload: boolean
  canReview: boolean
}

function rowHasTrailingActions(
  row: OrgHrmDocumentRow,
  context: DocumentsListContext
): boolean {
  if (context.canDownload) return true
  return context.canReview && row.verificationStatus === "pending"
}

export function buildDocumentsListSurfaceConfiguration(
  rows: readonly OrgHrmDocumentRow[],
  copy: DocumentsListCopy,
  context?: DocumentsListContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: DOCUMENTS_READ_PERMISSION,
    presentation: PRESENTATION,
    surface: {
      header: { title: DOCUMENTS_LIST_SURFACE_ID },
      columnsId: DOCUMENTS_LIST_SURFACE_ID,
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
      { id: "employee", header: copy.colEmployee },
      {
        id: "classification",
        header: copy.colClassification,
        cellKind: { kind: "badge", tone: "default" },
      },
      {
        id: "verification",
        header: copy.colVerification,
        cellKind: { kind: "badge", tone: "attention" },
      },
      { id: "size", header: copy.colSize },
      {
        id: "uploadedAt",
        header: copy.colUploadedAt,
        cellKind: { kind: "datetime" },
      },
      { id: "hash", header: copy.colHash },
    ],
    rows: rows.map((row) => {
      const typeLabel = isHrmDocumentType(row.documentType)
        ? copy.typeLabelFor(row.documentType)
        : row.documentType
      const classificationLabel = isHrmDocumentClassification(
        row.classification
      )
        ? copy.classificationLabelFor(row.classification)
        : row.classification
      const verificationLabel = isHrmDocumentVerificationStatus(
        row.verificationStatus
      )
        ? copy.verificationLabelFor(row.verificationStatus)
        : row.verificationStatus
      const employeeCell = row.employeeId
        ? row.employeeNumber
          ? `${row.employeeFullName ?? row.employeeId} · ${row.employeeNumber}`
          : (row.employeeFullName ?? row.employeeId)
        : copy.noEmployeeBadge

      return {
        id: row.id,
        cells: {
          title: `${row.title} (${row.mimeType})`,
          type: typeLabel,
          employee: employeeCell,
          classification: classificationLabel,
          verification: verificationLabel,
          size: formatHrmDocumentSize(row.sizeBytes),
          uploadedAt: copy.formatUploadedAt(row.uploadedAt),
          hash: shortenPayloadHash(row.payloadHash),
        },
        trailingAction: context?.showActionsColumn
          ? resolveListSurfaceRowTrailingAction({
              visible: true,
              allowed: rowHasTrailingActions(row, context),
            })
          : undefined,
      }
    }),
  }
}
