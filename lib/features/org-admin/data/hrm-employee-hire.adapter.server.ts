import "server-only"

import { createEmployeeMutation } from "#features/hrm/server"
import { writeIamAuditEvent } from "#lib/auth"

import {
  hrmEmployeeHireRowSchema,
  type HrmEmployeeHireRow,
} from "../schemas/hrm-employee-hire-row.schema"
import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  AdapterParseErr,
  AdapterParseOk,
  OrgImportAdapter,
} from "./import-adapter.server"

/**
 * Bulk employee-hire adapter. Creates one `hrm_employee` row per CSV row and
 * emits `erp.hrm.employee.create` audit events on success.
 *
 * Required headers: `employee_number`, `legal_name`.
 * Optional headers: `preferred_name`, `email`, `department_id`, `position_id`, `grade_id`.
 *
 * FK fields (`department_id`, `position_id`, `grade_id`) must reference rows
 * that already belong to the organization. The DB FK constraint will surface
 * violations as `code: "unknown"` failures at apply time.
 */
export const hrmEmployeeHireAdapter: OrgImportAdapter<HrmEmployeeHireRow> = {
  id: "hrm_employee_hire",
  requiredHeaders: ["employee_number", "legal_name"],

  parseRow(
    record: Record<string, string>
  ): AdapterParseOk<HrmEmployeeHireRow> | AdapterParseErr {
    const result = hrmEmployeeHireRowSchema.safeParse({
      employeeNumber: record.employee_number,
      legalName: record.legal_name,
      preferredName: record.preferred_name || undefined,
      email: record.email || undefined,
      departmentId: record.department_id || undefined,
      positionId: record.position_id || undefined,
      gradeId: record.grade_id || undefined,
    })

    if (!result.success) {
      const issue = result.error.issues[0]
      const field = issue?.path[0]
      return {
        ok: false,
        code: "validation",
        error: issue?.message ?? "Invalid row",
        field: typeof field === "string" ? field : undefined,
      }
    }

    return { ok: true, payload: result.data }
  },

  async applyRow(
    ctx: AdapterApplyCtx,
    payload: HrmEmployeeHireRow
  ): Promise<AdapterApplyOk | AdapterApplyErr> {
    const result = await createEmployeeMutation({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      employeeNumber: payload.employeeNumber,
      legalName: payload.legalName,
      preferredName: payload.preferredName ?? null,
      email: payload.email ?? null,
      currentDepartmentId: payload.departmentId ?? null,
      currentPositionId: payload.positionId ?? null,
      currentJobGradeId: payload.gradeId ?? null,
    })

    if (!result.ok) {
      if (result.code === "duplicate_employee_number") {
        return {
          ok: false,
          code: "duplicate",
          message: result.message,
          field: "employee_number",
        }
      }
      return { ok: false, code: "unknown", message: result.message }
    }

    await writeIamAuditEvent({
      action: "erp.hrm.employee.create",
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
      actorSessionId: ctx.actorSessionId,
      resourceType: "hrm_employee",
      resourceId: result.employeeId,
      metadata: {
        employeeNumber: payload.employeeNumber,
        hasEmail: Boolean(payload.email),
        hasPreferredName: Boolean(payload.preferredName),
        hasDepartment: Boolean(payload.departmentId),
        hasPosition: Boolean(payload.positionId),
        hasJobGrade: Boolean(payload.gradeId),
        source: "csv_import",
      },
    })

    return {
      ok: true,
      resourceType: "hrm_employee",
      resourceId: result.employeeId,
    }
  },
}
