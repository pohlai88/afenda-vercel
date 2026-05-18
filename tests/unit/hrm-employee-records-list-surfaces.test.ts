import { describe, expect, it } from "vitest"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"
import { buildEmployeeDependentsListSurfaceConfiguration } from "#features/hrm/employee-management/employee-records-management/data/employee-dependents-list-surface.server"
import { buildEmployeeDocumentVaultListSurfaceConfiguration } from "#features/hrm/employee-management/employee-records-management/data/employee-document-vault-list-surface.server"

const DEPENDENT_ROW = {
  id: "dep-1",
  legalName: "Alex Dependent",
  relationship: "child",
  dateOfBirth: new Date("2015-06-01T00:00:00.000Z"),
  taxDependent: true,
} as const

const DOCUMENT_ROW = {
  id: "doc-1",
  title: "Contract",
  documentType: "employment_contract",
  uploadedAt: new Date("2026-01-15T12:00:00.000Z"),
  blobUrl: "https://example.test/doc-1",
  payloadHash: "hash-doc-1",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  classification: "internal",
  verificationStatus: "verified",
  rejectionReason: null,
  versionNumber: 1,
  isMandatory: false,
} as const

const dependentsCopy = {
  empty: "No dependents",
  colName: "Name",
  colRelationship: "Relationship",
  colDateOfBirth: "DOB",
  colTaxDependent: "Tax",
  relationshipLabelFor: (relationship: string) => relationship,
  formatDateOfBirth: () => "—",
  taxDependentLabelFor: () => "Yes",
} as const

const vaultCopy = {
  empty: "No documents",
  colTitle: "Title",
  colType: "Type",
  colUploaded: "Uploaded",
  typeLabelFor: (documentType: string) => documentType,
  formatUploadedAt: () => "Jan 15, 2026",
} as const

describe("employee records list surface trailing actions", () => {
  it("hides dependent archive trailing when canArchive is false", () => {
    const config = buildEmployeeDependentsListSurfaceConfiguration(
      [DEPENDENT_ROW],
      dependentsCopy,
      { canArchive: false }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "hidden" })
  })

  it("marks dependent archive trailing ready when canArchive is true", () => {
    const config = buildEmployeeDependentsListSurfaceConfiguration(
      [DEPENDENT_ROW],
      dependentsCopy,
      { canArchive: true }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })

  it("hides document vault trailing when canDownload is false", () => {
    const config = buildEmployeeDocumentVaultListSurfaceConfiguration(
      [DOCUMENT_ROW],
      vaultCopy,
      { canDownload: false }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "hidden" })
  })

  it("marks document vault trailing ready when canDownload is true", () => {
    const config = buildEmployeeDocumentVaultListSurfaceConfiguration(
      [DOCUMENT_ROW],
      vaultCopy,
      { canDownload: true }
    ) satisfies ListSurfaceRendererConfigurationInput

    expect(config.rows[0]?.trailingAction).toEqual({ state: "ready" })
  })
})
