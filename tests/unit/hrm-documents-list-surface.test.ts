import { describe, expect, it } from "vitest"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"
import {
  buildDocumentsListSurfaceConfiguration,
  type DocumentsListContext,
} from "#features/hrm/employee-management/documents-management/data/documents-list-surface.server"
import type { OrgHrmDocumentRow } from "#features/hrm/employee-management/documents-management/data/hrm-document.queries.server"

const DOCUMENT_ROW = {
  id: "doc-1",
  title: "Passport",
  mimeType: "application/pdf",
  documentType: "identity_document",
  classification: "confidential",
  verificationStatus: "pending",
  sizeBytes: 1024,
  uploadedAt: new Date("2026-01-15T12:00:00.000Z"),
  payloadHash: "abc123def456",
  blobUrl: "https://blob.example.test/doc-1",
  rejectionReason: null,
  versionNumber: 1,
  isMandatory: false,
  employeeId: "emp-1",
  employeeNumber: "E001",
  employeeFullName: "Alex Example",
  legalEntityId: null,
  documentGroup: null,
  subjectKind: "employee",
  subjectId: "emp-1",
  effectiveFrom: new Date("2026-01-15T12:00:00.000Z"),
  effectiveTo: null,
  uploadedByUserId: null,
  documentSetId: null,
  previousDocumentId: null,
  replacedByDocumentId: null,
  isLatestVersion: true,
  documentLifecycleStatus: "active",
  retentionPolicyCode: null,
  retentionUntil: null,
  archivedAt: null,
  deletedAt: null,
  expiryState: "none",
  effectiveVerificationStatus: "pending",
} as const satisfies OrgHrmDocumentRow

const documentsCopy = {
  empty: "No documents",
  colTitle: "Title",
  colType: "Type",
  colEmployee: "Employee",
  colClassification: "Classification",
  colVerification: "Verification",
  colSize: "Size",
  colUploadedAt: "Uploaded",
  colHash: "Hash",
  noEmployeeBadge: "Org-level",
  typeLabelFor: (value: string) => value,
  classificationLabelFor: (value: string) => value,
  verificationLabelFor: (value: string) => value,
  formatUploadedAt: () => "Jan 15, 2026",
} as const

const trailingContext = {
  showActionsColumn: true,
  canDownload: true,
  canReview: true,
} as const satisfies DocumentsListContext

describe("buildDocumentsListSurfaceConfiguration", () => {
  it("requires document read permission", () => {
    const config = buildDocumentsListSurfaceConfiguration(
      [],
      documentsCopy
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.requiresErpPermission).toEqual({
      module: "hrm",
      object: "document",
      function: "read",
    })
  })

  it("marks trailing ready when review or download applies", () => {
    const config = buildDocumentsListSurfaceConfiguration(
      [DOCUMENT_ROW],
      documentsCopy,
      trailingContext
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("marks trailing disabled when row has no actions", () => {
    const config = buildDocumentsListSurfaceConfiguration(
      [
        {
          ...DOCUMENT_ROW,
          verificationStatus: "verified",
        },
      ],
      documentsCopy,
      { showActionsColumn: true, canDownload: false, canReview: true }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction?.state).toBe("disabled")
  })

  it("omits trailing metadata when actions column is hidden", () => {
    const config = buildDocumentsListSurfaceConfiguration(
      [DOCUMENT_ROW],
      documentsCopy,
      { showActionsColumn: false, canDownload: false, canReview: false }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toBeUndefined()
  })
})
