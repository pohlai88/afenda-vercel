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
    const leaveSource = readFileSync(
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

    expect(leaveSource).toContain("requestPortalEmployeeLeaveAction")
    expect(leaveSource).toContain("cancelPortalEmployeeLeaveAction")
    expect(leaveSource).toContain("getEmployeePortalContext(rawPortalSlug)")
    expect(leaveSource).toContain("EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR")
    expect(leaveSource).not.toContain(
      `form: "${EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR}"`
    )
    expect(leaveSource).toContain("employeeId: context.employee.id")
    const portalRequestActionSource = leaveSource.slice(
      leaveSource.indexOf("requestPortalEmployeeLeaveAction"),
      leaveSource.indexOf("applyLeaveOnBehalfAction")
    )
    expect(portalRequestActionSource).not.toContain(
      'employeeId: formData.get("employeeId")'
    )
  })
})
