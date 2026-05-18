import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const documentRoot = join(
  repoRoot,
  "lib/features/hrm/employee-management/documents-management"
)
const essRoot = join(
  repoRoot,
  "lib/features/hrm/employee-management/employee-selfservice-portal"
)

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8")
}

describe("HRM document backend gap closure contracts", () => {
  it("adds version, lifecycle, requirement, and retention schema surfaces", () => {
    const schema = readRepoFile("lib/db/schema.ts")

    expect(schema).toContain("export const hrmDocumentRequirement")
    expect(schema).toContain("export const hrmDocumentRetentionRule")
    expect(schema).toContain('documentSetId: text("documentSetId")')
    expect(schema).toContain('isLatestVersion: boolean("isLatestVersion")')
    expect(schema).toContain(
      'documentLifecycleStatus: text("documentLifecycleStatus")'
    )
    expect(schema).toContain(
      'acknowledgementMethod: text("acknowledgementMethod")'
    )
  })

  it("exposes guarded server read/search/download and metadata contracts", () => {
    const server = readRepoFile("lib/features/hrm/server.ts")
    const guarded = readFileSync(
      join(documentRoot, "data", "hrm-document-guarded.server.ts"),
      "utf8"
    )
    const metadata = readFileSync(
      join(documentRoot, "data", "hrm-document-surface-metadata.shared.ts"),
      "utf8"
    )

    expect(server).toContain("searchHrmDocumentsForCurrentOrg")
    expect(server).toContain("getEmployeeDocumentReadiness")
    expect(server).toContain("getSecureHrmDocumentDownload")
    expect(guarded).toContain('function: "search"')
    expect(guarded).toContain('function: "read"')
    expect(guarded).toContain('function: "audit"')
    expect(guarded).toContain("HRM_DOCUMENT_AUDIT.download")
    expect(metadata).toContain("HRM_DOCUMENT_SURFACE_COLUMNS")
    expect(metadata).toContain("HRM_DOCUMENT_SURFACE_FILTERS")
    expect(metadata).toContain("HRM_DOCUMENT_SURFACE_ROW_ACTIONS")
  })

  it("keeps employee portal document downloads behind a server action", () => {
    const page = readFileSync(
      join(essRoot, "components", "employee-portal-documents-page.tsx"),
      "utf8"
    )
    const actions = readFileSync(
      join(essRoot, "actions", "employee-portal-document.actions.ts"),
      "utf8"
    )

    expect(page).toContain("listEmployeeVisibleDocuments")
    expect(page).toContain("downloadPortalEmployeeDocumentAction")
    expect(page).not.toContain("href={doc.blobUrl}")
    expect(actions).toContain("submitPortalEmployeeDocumentAction")
    expect(actions).toContain("canEmployeePortalAccessDocument")
    expect(actions).toContain("findEmployeeSubmissionRequirement")

    const governance = readFileSync(
      join(documentRoot, "data", "hrm-document-governance.server.ts"),
      "utf8"
    )
    expect(governance).toContain("eq(hrmDocument.isLatestVersion, true)")
    expect(governance).toContain(
      'eq(hrmDocument.documentLifecycleStatus, "active")'
    )
    expect(governance).toContain(
      'eq(hrmDocument.documentLifecycleStatus, "archived")'
    )
  })

  it("persists policy acknowledgements for compliance summaries", () => {
    const action = readFileSync(
      join(essRoot, "actions", "employee-portal-acknowledgement.actions.ts"),
      "utf8"
    )
    const summary = readRepoFile(
      "lib/features/hrm/employee-management/compliance-regulatory-tracking/data/employee-compliance-summary.queries.server.ts"
    )

    expect(action).toContain("insert(hrmPolicyAcknowledgement)")
    expect(action).toContain("acknowledgementMethod")
    expect(action).toContain("acknowledgedByUserId")
    expect(summary).toContain("hrmPolicyAcknowledgement")
    expect(summary).toContain("deriveEffectiveDocumentVerificationStatus")
  })

  it("hardens HRM blob upload paths with document or portal authorization", () => {
    const route = readRepoFile("app/api/upload/blob/route.ts")

    expect(route).toContain("canUploadHrmDocumentForUser")
    expect(route).toContain("canUploadPortalEmployeeDocument")
    expect(route).toContain("isAllowedPortalHrmUploadPath")
    expect(route).not.toContain("if (!parsed.claimId) return true")
  })
})
