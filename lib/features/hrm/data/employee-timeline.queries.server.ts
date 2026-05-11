import "server-only"

import { and, desc, eq, inArray, like, or } from "drizzle-orm"

import { AUDIT_ORIGIN } from "#lib/auth/audit-origin.shared"
import { db } from "#lib/db"
import {
  hrmDocument,
  hrmEmploymentContract,
  hrmPayrollProfile,
  iamAuditEvent,
} from "#lib/db/schema"
import { neonAuthUser } from "#lib/db/schema-neon-auth"

import type { EmployeeIamAuditTimelineRow } from "../types"

const DEFAULT_TIMELINE_LIMIT = 150
const MAX_TIMELINE_LIMIT = 300

export async function listEmployeeIamAuditTimeline(input: {
  organizationId: string
  employeeId: string
  limit?: number
}): Promise<EmployeeIamAuditTimelineRow[]> {
  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_TIMELINE_LIMIT, 1),
    MAX_TIMELINE_LIMIT
  )

  const [contractRows, payrollRows, documentRows] = await Promise.all([
    db
      .select({ id: hrmEmploymentContract.id })
      .from(hrmEmploymentContract)
      .where(
        and(
          eq(hrmEmploymentContract.organizationId, input.organizationId),
          eq(hrmEmploymentContract.employeeId, input.employeeId)
        )
      ),
    db
      .select({ id: hrmPayrollProfile.id })
      .from(hrmPayrollProfile)
      .where(
        and(
          eq(hrmPayrollProfile.organizationId, input.organizationId),
          eq(hrmPayrollProfile.employeeId, input.employeeId)
        )
      ),
    db
      .select({ id: hrmDocument.id })
      .from(hrmDocument)
      .where(
        and(
          eq(hrmDocument.organizationId, input.organizationId),
          eq(hrmDocument.employeeId, input.employeeId)
        )
      ),
  ])

  const contractIds = contractRows.map((r) => r.id)
  const payrollIds = payrollRows.map((r) => r.id)
  const documentIds = documentRows.map((r) => r.id)

  const orgMatch = eq(iamAuditEvent.organizationId, input.organizationId)
  const originMatch = eq(iamAuditEvent.auditOrigin, AUDIT_ORIGIN.production)
  const actionMatch = like(iamAuditEvent.action, "erp.hrm.%")

  const branches = [
    and(
      eq(iamAuditEvent.resourceType, "hrm_employee"),
      eq(iamAuditEvent.resourceId, input.employeeId)
    ),
  ]

  if (contractIds.length > 0) {
    branches.push(
      and(
        eq(iamAuditEvent.resourceType, "hrm_employment_contract"),
        inArray(iamAuditEvent.resourceId, contractIds)
      )
    )
  }
  if (payrollIds.length > 0) {
    branches.push(
      and(
        eq(iamAuditEvent.resourceType, "hrm_payroll_profile"),
        inArray(iamAuditEvent.resourceId, payrollIds)
      )
    )
  }
  if (documentIds.length > 0) {
    branches.push(
      and(
        eq(iamAuditEvent.resourceType, "hrm_document"),
        inArray(iamAuditEvent.resourceId, documentIds)
      )
    )
  }

  const resourceMatch = or(...branches)

  const rows = await db
    .select({
      id: iamAuditEvent.id,
      createdAt: iamAuditEvent.createdAt,
      action: iamAuditEvent.action,
      actorUserId: iamAuditEvent.actorUserId,
      actorEmail: neonAuthUser.email,
      resourceType: iamAuditEvent.resourceType,
      resourceId: iamAuditEvent.resourceId,
      metadata: iamAuditEvent.metadata,
    })
    .from(iamAuditEvent)
    .leftJoin(neonAuthUser, eq(iamAuditEvent.actorUserId, neonAuthUser.id))
    .where(and(orgMatch, originMatch, actionMatch, resourceMatch))
    .orderBy(desc(iamAuditEvent.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    action: r.action,
    actorUserId: r.actorUserId,
    actorEmail: r.actorEmail,
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    metadata: r.metadata,
  }))
}
