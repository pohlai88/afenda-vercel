import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const DM_ROOT = join(
  process.cwd(),
  "lib/features/hrm/employee-management/documents-management"
)

describe("HRM documents management contracts", () => {
  it("uses ERP RBAC mutation gate and canonical audit strings", () => {
    const actions = readFileSync(
      join(DM_ROOT, "actions", "hrm-document.actions.ts"),
      "utf8"
    )

    expect(actions).toContain("requireHrmDocumentMutationGate")
    expect(actions).toContain("HRM_DOCUMENT_AUDIT")
    expect(actions).toContain("revalidateHrmDocumentSurfaces")
    expect(actions).toContain(
      'toLocaleOrgAppsRevalidatePattern("/hrm/documents")'
    )
    expect(actions).toContain("logUnexpectedServerError")
    expect(actions).not.toContain("canActInOrganization")
    expect(actions).not.toContain("requireHrmOrgTenantFromForm")
  })

  it("resolves vault capabilities from ERP document permissions", () => {
    const page = readFileSync(
      join(DM_ROOT, "components", "documents-page.tsx"),
      "utf8"
    )

    expect(page).toContain("resolveHrmDocumentSurfaceCapabilities")
    expect(page).toContain("canViewVault")
    expect(page).not.toContain("canActInOrganization")
  })

  it("gates vault review UI on document update permission", () => {
    const library = readFileSync(
      join(DM_ROOT, "components", "documents-library.tsx"),
      "utf8"
    )

    expect(library).toContain("HrmDocumentVerifyForm")
    expect(library).toContain('row.verificationStatus === "pending"')
  })
})
