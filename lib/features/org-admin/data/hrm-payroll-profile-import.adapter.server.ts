import "server-only"

import { and, eq } from "drizzle-orm"

import { upsertPayrollProfileMutation } from "#features/hrm/server"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import {
  hrmPayrollProfileImportRowSchema,
  type HrmPayrollProfileImportRow,
} from "../schemas/hrm-payroll-profile-import.schema"
import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  AdapterParseErr,
  AdapterParseOk,
  OrgImportAdapter,
} from "./import-adapter.server"

export const hrmPayrollProfileImportAdapter: OrgImportAdapter<HrmPayrollProfileImportRow> =
  {
    id: "hrm_payroll_profile_import",
    requiredHeaders: ["employee_number", "effective_from"],

    parseRow(
      record: Record<string, string>
    ): AdapterParseOk<HrmPayrollProfileImportRow> | AdapterParseErr {
      const result = hrmPayrollProfileImportRowSchema.safeParse({
        employeeNumber: record.employee_number,
        effectiveFrom: record.effective_from,
        countryCode: record.country_code || undefined,
        epfNumber: record.epf_number || undefined,
        taxIdentifierType: record.tax_identifier_type || undefined,
        taxIdentifierNumber: record.tax_identifier_number || undefined,
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
      payload: HrmPayrollProfileImportRow
    ): Promise<AdapterApplyOk | AdapterApplyErr> {
      const [emp] = await db
        .select({ id: hrmEmployee.id })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, ctx.organizationId),
            eq(hrmEmployee.employeeNumber, payload.employeeNumber)
          )
        )
        .limit(1)

      if (!emp) {
        return {
          ok: false,
          code: "validation",
          message: "Unknown employee_number for this organization.",
          field: "employee_number",
        }
      }

      const country =
        payload.countryCode && payload.countryCode.trim().length > 0
          ? payload.countryCode.trim()
          : "MY"

      const applied = await upsertPayrollProfileMutation({
        organizationId: ctx.organizationId,
        employeeId: emp.id,
        actorUserId: ctx.actorUserId,
        effectiveFrom: payload.effectiveFrom,
        countryCode: country,
        epfNumber: payload.epfNumber?.trim() || null,
        taxIdentifierType: payload.taxIdentifierType?.trim() || null,
        taxIdentifierNumber: payload.taxIdentifierNumber?.trim() || null,
        eisEligible: true,
        hrdfApplicable: false,
        paySchedule: "monthly",
        payCurrency: "MYR",
      })

      if (!applied.ok) {
        return {
          ok: false,
          code: "validation",
          message: applied.message,
          field: "effective_from",
        }
      }

      return {
        ok: true,
        resourceType: "hrm_payroll_profile",
        resourceId: applied.profileId,
      }
    },
  }
