import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { PortalContext } from "#lib/portal"
import { PORTAL_SLUG_MAX_LENGTH } from "#lib/portal"

import {
  EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
  buildEmployeePortalSlugCandidates,
  resolveEmployeePortalContextFromRows,
  type EmployeePortalSubjectRow,
} from "../../lib/features/hrm/data/employee-portal-access.shared"
import { payrollPayslipSnapshotFromDocumentPayload } from "../../lib/features/hrm/data/payroll-close.shared"

const basePortalContext: PortalContext = {
  portalId: "portal_01",
  portalSlug: "acme-employee",
  portalAudience: "employee",
  portalDisplayName: "Employee Portal",
  organizationId: "org_01",
  organizationName: "Acme",
  userId: "user_01",
  sessionId: "session_01",
  user: {
    email: "employee@example.com",
    name: "Employee One",
    role: null,
  },
  subjectId: "employee_01",
}

const employee: EmployeePortalSubjectRow = {
  id: "employee_01",
  employeeNumber: "E-001",
  legalName: "Employee One",
  linkedUserId: "user_01",
  archivedAt: null,
}

describe("HRM employee portal contract", () => {
  it("builds deterministic employee portal slug candidates", () => {
    const [primary, fallback] = buildEmployeePortalSlugCandidates({
      orgSlug: "Acme_Main",
      organizationId: "org-1234567890abcdef",
    })

    expect(primary).toBe("acme_main-employee")
    expect(fallback).toBe("acme_main-employee-org123456789")
    expect(primary.length).toBeLessThanOrEqual(PORTAL_SLUG_MAX_LENGTH)
    expect(fallback.length).toBeLessThanOrEqual(PORTAL_SLUG_MAX_LENGTH)
  })

  it("trims long organization slugs without losing deterministic fallback", () => {
    const [primary, fallback] = buildEmployeePortalSlugCandidates({
      orgSlug: "very-long-organization-slug-that-must-fit-the-portal-url",
      organizationId: "f0f1f2f3-f4f5-f6f7-f8f9-fafbfccdcecf",
    })

    expect(primary).toMatch(/-employee$/)
    expect(fallback).toMatch(/-employee-f0f1f2f3f4f5$/)
    expect(primary.length).toBeLessThanOrEqual(PORTAL_SLUG_MAX_LENGTH)
    expect(fallback.length).toBeLessThanOrEqual(PORTAL_SLUG_MAX_LENGTH)
  })

  it("resolves only active employee subjects owned by the portal user", () => {
    expect(
      resolveEmployeePortalContextFromRows({
        portal: basePortalContext,
        employee,
      })
    ).toEqual({
      ok: true,
      context: { portal: basePortalContext, employee },
    })

    expect(
      resolveEmployeePortalContextFromRows({
        portal: { ...basePortalContext, portalAudience: "supplier" },
        employee,
      })
    ).toEqual({ ok: false, reason: "wrong_audience" })
    expect(
      resolveEmployeePortalContextFromRows({
        portal: { ...basePortalContext, subjectId: null },
        employee,
      })
    ).toEqual({ ok: false, reason: "missing_subject" })
    expect(
      resolveEmployeePortalContextFromRows({
        portal: basePortalContext,
        employee: { ...employee, archivedAt: new Date("2026-01-01") },
      })
    ).toEqual({ ok: false, reason: "employee_archived" })
    expect(
      resolveEmployeePortalContextFromRows({
        portal: basePortalContext,
        employee: { ...employee, linkedUserId: "user_02" },
      })
    ).toEqual({ ok: false, reason: "linked_user_mismatch" })
  })

  it("keeps explicit portal access authoritative when the employee has no linked user", () => {
    const unlinkedEmployee = { ...employee, linkedUserId: null }

    expect(
      resolveEmployeePortalContextFromRows({
        portal: basePortalContext,
        employee: unlinkedEmployee,
      })
    ).toEqual({
      ok: true,
      context: { portal: basePortalContext, employee: unlinkedEmployee },
    })
  })

  it("reconstructs stored payslip payloads into portal snapshot shape", () => {
    const snapshot = payrollPayslipSnapshotFromDocumentPayload({
      payload: {
        runId: "11111111-1111-4111-8111-111111111111",
        periodId: "22222222-2222-4222-8222-222222222222",
        employeeId: "33333333-3333-4333-8333-333333333333",
        employeeNumber: "E-001",
        employeeLegalName: "Employee One",
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        paymentDate: "2026-05-01",
        currency: "MYR",
        rulePackVersion: "my-v1",
        grossPay: "1000.00",
        netPay: "800.00",
        employerCost: "1100.00",
        inputDigest: "digest_01",
        generatedAt: "2026-05-01T00:00:00.000Z",
        lines: [
          {
            lineKind: "earning",
            code: "BASIC",
            description: "Basic salary",
            amount: "1000.00",
            rulePackProvenance: null,
          },
        ],
      },
      payloadHash: "hash_01",
    })

    expect(snapshot?.inputHash).toBe("hash_01")
    expect(snapshot?.lines).toHaveLength(1)
    expect(
      payrollPayslipSnapshotFromDocumentPayload({
        payload: { bad: true },
        payloadHash: "hash_02",
      })
    ).toBeNull()
  })

  it("keeps provisioning and portal leave actions behind server-derived context", () => {
    const provisioningDataSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "data",
        "employee-portal-access.server.ts"
      ),
      "utf8"
    )
    const provisioningSharedSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "data",
        "employee-portal-access.shared.ts"
      ),
      "utf8"
    )
    const provisioningSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "actions",
        "employee-portal-access.actions.ts"
      ),
      "utf8"
    )
    const workbenchLeaveSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "actions",
        "leave-request.actions.ts"
      ),
      "utf8"
    )
    const portalLeaveSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "actions",
        "employee-portal-leave.actions.ts"
      ),
      "utf8"
    )
    const leaveCommandSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "data",
        "leave-request-commands.server.ts"
      ),
      "utf8"
    )
    const payslipQuerySource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "data",
        "hrm-document.queries.server.ts"
      ),
      "utf8"
    )
    const payslipListPageSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "components",
        "employee-portal-payslips-page.tsx"
      ),
      "utf8"
    )
    const payslipDetailPageSource = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "components",
        "employee-portal-payslip-detail-page.tsx"
      ),
      "utf8"
    )

    expect(provisioningSource).toContain("requireHrmPermission")
    expect(provisioningSource).toContain('object: "employee"')
    expect(provisioningSource).toContain('function: "update"')
    expect(provisioningSource).toContain('"iam.portal.access.grant"')
    expect(provisioningSource).toContain('"iam.portal.access.revoke"')
    expect(provisioningSource).toContain("subjectId: gate.employee.id")
    expect(provisioningSource).toContain("userId: input.linkedUserId")
    expect(provisioningSource).toContain("targetUserId: linkedUserId")
    expect(provisioningDataSource).toContain("const concurrentPortal")
    expect(provisioningDataSource).toContain("created: false")
    expect(provisioningSource).toContain(
      "ne(organizationPortalAccess.userId, input.linkedUserId)"
    )
    expect(provisioningSource).toContain(
      "writeEmployeePortalAccessGrantWithRetry"
    )
    expect(provisioningSource).toContain("isUniqueViolation")
    expect(provisioningSharedSource).toContain(
      "EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR"
    )

    expect(workbenchLeaveSource).not.toContain(
      "requestPortalEmployeeLeaveAction"
    )
    expect(workbenchLeaveSource).not.toContain(
      "cancelPortalEmployeeLeaveAction"
    )
    expect(portalLeaveSource).toContain("requestPortalEmployeeLeaveAction")
    expect(portalLeaveSource).toContain("cancelPortalEmployeeLeaveAction")
    expect(portalLeaveSource).toContain(
      "getEmployeePortalContext(rawPortalSlug)"
    )
    expect(portalLeaveSource).toContain(
      "EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR"
    )
    expect(portalLeaveSource).not.toContain("requireOrgSession")
    expect(leaveCommandSource).not.toContain("requireOrgSession")
    expect(portalLeaveSource).not.toContain(
      `form: "${EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR}"`
    )
    expect(portalLeaveSource).toContain("employeeId: context.employee.id")
    const portalRequestActionSource = portalLeaveSource.slice(
      portalLeaveSource.indexOf("requestPortalEmployeeLeaveAction"),
      portalLeaveSource.indexOf("cancelPortalEmployeeLeaveAction")
    )
    expect(portalRequestActionSource).not.toContain(
      'employeeId: formData.get("employeeId")'
    )
    expect(payslipQuerySource).toContain("listPayslipDocumentsForEmployee")
    expect(payslipQuerySource).toContain("getPayslipDocumentForEmployee")
    expect(payslipQuerySource).toContain(
      'eq(hrmDocument.documentType, "payslip")'
    )
    expect(payslipQuerySource).toContain(
      'eq(hrmDocument.subjectKind, "payroll_run")'
    )
    expect(payslipQuerySource).toContain("grossPay: hrmPayrollRun.grossPay")
    expect(payslipQuerySource).toContain("netPay: hrmPayrollRun.netPay")
    expect(payslipQuerySource).toContain(
      "snapshot.runId !== document.subjectId"
    )
    expect(payslipQuerySource).toContain(
      "snapshot.periodId !== document.periodId"
    )
    expect(payslipQuerySource).toContain('"portal_payslip_snapshot_mismatch"')
    expect(payslipQuerySource).toContain('access: "private"')
    expect(payslipQuerySource).toContain("useCache: false")
    expect(payslipQuerySource).toContain(
      "payrollPayslipSnapshotFromDocumentPayload"
    )
    const payslipSummaryTypeSource = payslipQuerySource.slice(
      payslipQuerySource.indexOf("export type EmployeePayslipDocumentSummary"),
      payslipQuerySource.indexOf("export type EmployeePayslipDocumentDetail")
    )
    expect(payslipSummaryTypeSource).not.toContain("blobUrl")
    expect(payslipSummaryTypeSource).not.toContain("payloadHash")
    expect(payslipListPageSource).toContain("requireEmployeePortalContext")
    expect(payslipDetailPageSource).toContain("requireEmployeePortalContext")
    expect(payslipDetailPageSource).toContain(
      '"iam.portal.employee.payslip.view"'
    )
    expect(payslipListPageSource).not.toContain("document.blobUrl")
    expect(payslipListPageSource).not.toContain("payloadHash")
    expect(payslipDetailPageSource).not.toContain("document.openUrl")
    expect(payslipDetailPageSource).not.toContain("inputHash")
    expect(payslipListPageSource).not.toContain("requireOrgSession")
    expect(payslipDetailPageSource).not.toContain("requireOrgSession")
  })

  it("keeps portal claims, attendance, and document actions server-context gated", () => {
    const claimPortal = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "actions",
        "employee-portal-claim.actions.ts"
      ),
      "utf8"
    )
    const attendancePortal = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "actions",
        "employee-portal-attendance.actions.ts"
      ),
      "utf8"
    )
    const documentPortal = readFileSync(
      join(
        process.cwd(),
        "lib",
        "features",
        "hrm",
        "actions",
        "employee-portal-document.actions.ts"
      ),
      "utf8"
    )

    for (const src of [claimPortal, attendancePortal, documentPortal]) {
      expect(src).toContain("getEmployeePortalContext")
      expect(src).not.toContain("requireOrgSession")
    }
  })
})
