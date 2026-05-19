import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const COMPLIANCE_ROOT = join(
  process.cwd(),
  "lib/features/hrm/employee-management/compliance-regulatory-tracking"
)

describe("HRM compliance regulatory tracking contracts", () => {
  it("uses ERP RBAC gates and canonical audit strings for exceptions", () => {
    const actions = readFileSync(
      join(COMPLIANCE_ROOT, "actions", "compliance-exception.actions.ts"),
      "utf8"
    )

    expect(actions).toContain("requireComplianceMutationGate")
    expect(actions).toContain("HRM_COMPLIANCE_REGULATORY_AUDIT")
    expect(actions).not.toContain("canActInOrganization")
    expect(actions).not.toContain("requireHrmAdmin")
  })

  it("uses ERP compliance update permission for statutory submission", () => {
    const submission = readFileSync(
      join(COMPLIANCE_ROOT, "actions", "statutory-submission.actions.ts"),
      "utf8"
    )
    const acknowledgement = readFileSync(
      join(COMPLIANCE_ROOT, "actions", "statutory-acknowledgement.actions.ts"),
      "utf8"
    )

    expect(submission).toContain("requireComplianceSessionMutationGate")
    expect(submission).toContain(
      "HRM_COMPLIANCE_REGULATORY_AUDIT.evidence.submitted"
    )
    expect(submission).not.toContain("requireHrmAdmin")
    expect(acknowledgement).toContain("requireComplianceSessionMutationGate")
    expect(acknowledgement).not.toContain("requireHrmAdmin")
  })

  it("uses contract audit strings for pack generation and mark submitted", () => {
    const compliance = readFileSync(
      join(COMPLIANCE_ROOT, "actions", "compliance.actions.ts"),
      "utf8"
    )

    expect(compliance).toContain(
      "HRM_COMPLIANCE_REGULATORY_AUDIT.pack.generated"
    )
    expect(compliance).toContain(
      "HRM_COMPLIANCE_REGULATORY_AUDIT.evidence.mark_submitted"
    )
    expect(compliance).toContain('object: "compliance"')
    expect(compliance).not.toContain("buildCrudSapAuditAction")
  })

  it("uses filing audit strings and obligation actions through the compliance contract", () => {
    const filing = readFileSync(
      join(COMPLIANCE_ROOT, "actions", "compliance-filing.actions.ts"),
      "utf8"
    )
    const obligations = readFileSync(
      join(COMPLIANCE_ROOT, "actions", "compliance-obligation.actions.ts"),
      "utf8"
    )

    expect(filing).toContain("HRM_COMPLIANCE_REGULATORY_AUDIT.filing.waived")
    expect(filing).not.toContain(
      "HRM_COMPLIANCE_REGULATORY_AUDIT.exception.waived"
    )
    expect(obligations).toContain(
      "HRM_COMPLIANCE_REGULATORY_AUDIT.obligation.configured"
    )
    expect(obligations).toContain(
      "HRM_COMPLIANCE_REGULATORY_AUDIT.obligation.archived"
    )
  })

  it("emits report.exported from compliance dashboard export action", () => {
    const report = readFileSync(
      join(COMPLIANCE_ROOT, "actions", "compliance-report.actions.ts"),
      "utf8"
    )

    expect(report).toContain("HRM_COMPLIANCE_REGULATORY_AUDIT.report.exported")
    expect(report).toContain("buildComplianceDashboardCsv")
    expect(report).toContain("listComplianceDashboardRowsForOrg")
  })
})
