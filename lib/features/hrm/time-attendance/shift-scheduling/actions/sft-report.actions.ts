"use server"

import { after } from "next/server"

import { and, eq, inArray } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import { HRM_SFT_AUDIT } from "../sft.contract"
import {
  rosterListFiltersSchema,
  rosterRangeSchema,
} from "../schemas/sft.schema"
import {
  listDepartmentsForOrg,
  listPositionsForOrg,
} from "../../../employee-management/organizational-chart-hierarchy/data/org-structure.queries.server"
import { buildSftRosterReportCsv } from "../data/sft-report-export.shared"
import { resolveLegalEntityLabelForDepartment } from "../data/sft-org-unit-filter.shared"
import { listRosterAssignmentsForOrg } from "../data/sft-roster.queries.server"

export async function exportShiftRosterCsvAction(
  formData: FormData
): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const { organizationId, userId, sessionId } = session

  const allowed = await canUseErpPermission({
    organizationId,
    userId,
    permission: {
      module: "hrm",
      object: "shift_schedule",
      function: "read",
    },
  })
  if (!allowed) {
    return { ok: false, error: "You are not authorized to export this report." }
  }

  const parsed = rosterRangeSchema.safeParse({
    rangeStart: formData.get("rangeStart"),
    rangeEnd: formData.get("rangeEnd"),
  })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid range.",
    }
  }
  if (parsed.data.rangeStart > parsed.data.rangeEnd) {
    return { ok: false, error: "Range end must be on or after start." }
  }

  const filtersParsed = rosterListFiltersSchema.safeParse({
    departmentId: formData.get("departmentId") || null,
    jobGradeId: formData.get("jobGradeId") || null,
    locationCode: formData.get("locationCode") || null,
    legalEntityOrgUnitId: formData.get("legalEntityOrgUnitId") || null,
    teamOrgUnitId: formData.get("teamOrgUnitId") || null,
    positionId: formData.get("positionId") || null,
  })
  const filters = filtersParsed.success ? filtersParsed.data : {}

  const [rows, departments, positions] = await Promise.all([
    listRosterAssignmentsForOrg({
      organizationId,
      rangeStart: parsed.data.rangeStart,
      rangeEnd: parsed.data.rangeEnd,
      filters,
    }),
    listDepartmentsForOrg(organizationId, { includeArchived: false }),
    listPositionsForOrg(organizationId, { includeArchived: false }),
  ])

  const departmentsById = new Map(
    departments.map((dept) => [dept.id, `${dept.code} · ${dept.name}`])
  )
  const departmentNodes = new Map(
    departments.map((dept) => [
      dept.id,
      {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        orgUnitType: dept.orgUnitType,
        parentDepartmentId: dept.parentDepartmentId,
      },
    ])
  )
  const legalEntitiesByDepartmentId = new Map<string, string>()
  for (const dept of departments) {
    legalEntitiesByDepartmentId.set(
      dept.id,
      resolveLegalEntityLabelForDepartment({
        departmentId: dept.id,
        departmentsById: departmentNodes,
      })
    )
  }

  const managerIds = [
    ...new Set(
      rows
        .map((row) => row.managerEmployeeId)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const managerRows =
    managerIds.length > 0
      ? await db
          .select({
            id: hrmEmployee.id,
            legalName: hrmEmployee.legalName,
            employeeNumber: hrmEmployee.employeeNumber,
          })
          .from(hrmEmployee)
          .where(
            and(
              eq(hrmEmployee.organizationId, organizationId),
              inArray(hrmEmployee.id, managerIds)
            )
          )
      : []

  const csv = buildSftRosterReportCsv(rows, {
    departmentsById,
    positionsById: new Map(
      positions.map((pos) => [pos.id, `${pos.code} · ${pos.title}`])
    ),
    legalEntitiesByDepartmentId,
    managersByEmployeeId: new Map(
      managerRows.map((row) => [
        row.id,
        row.legalName
          ? row.employeeNumber
            ? `${row.legalName} · ${row.employeeNumber}`
            : row.legalName
          : row.id,
      ])
    ),
  })
  const filename = `shift-roster-${parsed.data.rangeStart}_${parsed.data.rangeEnd}.csv`

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_SFT_AUDIT.reportExport,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_shift_schedule_report",
      resourceId: filename,
      metadata: {
        rowCount: rows.length,
        format: "csv",
        rangeStart: parsed.data.rangeStart,
        rangeEnd: parsed.data.rangeEnd,
      },
    })
  )

  return { ok: true, csv, filename }
}
