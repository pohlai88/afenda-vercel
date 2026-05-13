"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_DASHBOARD_HRM_KPI } from "#lib/dashboard-module-paths"
import { db } from "#lib/db"
import { hrmEmployee, hrmKpiPeriod, hrmKpiScore } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import { requireHrmOrgTenantFromForm } from "../data/hrm-action-guard.server"
import { isoDateOnlyToUtcDate } from "../data/hrm-calendar-dates.server"
import {
  createKpiPeriodFormSchema,
  upsertKpiScoreFormSchema,
} from "../schemas/kpi.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { ContractMutationFormState } from "../types"

function revalidateKpi() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_HRM_KPI), "page")
}

export async function createKpiPeriodAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const admin = await requireHrmAdmin()
  if (!admin.ok) return hrmActionFailure({ form: admin.error })

  const parsed = createKpiPeriodFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    name: formData.get("name"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid KPI period." })
  }

  const id = crypto.randomUUID()
  await db.insert(hrmKpiPeriod).values({
    id,
    organizationId,
    name: parsed.data.name,
    periodStart: isoDateOnlyToUtcDate(parsed.data.periodStart),
    periodEnd: isoDateOnlyToUtcDate(parsed.data.periodEnd),
    state: "draft",
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.period.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_period",
      resourceId: id,
      metadata: { name: parsed.data.name },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function upsertKpiScoreAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireHrmOrgTenantFromForm(formData)
  if (!gate.ok) return gate.response
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const admin = await requireHrmAdmin()
  if (!admin.ok) return hrmActionFailure({ form: admin.error })

  const parsed = upsertKpiScoreFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    periodId: formData.get("periodId"),
    employeeId: formData.get("employeeId"),
    metricCode: formData.get("metricCode"),
    targetValue: formData.get("targetValue"),
    achievedValue: formData.get("achievedValue"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid KPI score input." })
  }

  const [period] = await db
    .select({ id: hrmKpiPeriod.id })
    .from(hrmKpiPeriod)
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, organizationId),
        eq(hrmKpiPeriod.id, parsed.data.periodId)
      )
    )
    .limit(1)
  if (!period) return hrmActionFailure({ form: "KPI period not found." })

  const [emp] = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, parsed.data.employeeId)
      )
    )
    .limit(1)
  if (!emp) return hrmActionFailure({ form: "Employee not found." })

  const now = new Date()
  const rowId = crypto.randomUUID()

  await db
    .insert(hrmKpiScore)
    .values({
      id: rowId,
      organizationId,
      periodId: parsed.data.periodId,
      employeeId: parsed.data.employeeId,
      metricCode: parsed.data.metricCode,
      targetValue: parsed.data.targetValue?.trim() || null,
      achievedValue: parsed.data.achievedValue?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      createdByUserId: userId,
      updatedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        hrmKpiScore.organizationId,
        hrmKpiScore.periodId,
        hrmKpiScore.employeeId,
        hrmKpiScore.metricCode,
      ],
      set: {
        targetValue: parsed.data.targetValue?.trim() || null,
        achievedValue: parsed.data.achievedValue?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        updatedByUserId: userId,
        updatedAt: now,
      },
    })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.score.upsert",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_score",
      resourceId: rowId,
      metadata: {
        periodId: parsed.data.periodId,
        employeeId: parsed.data.employeeId,
        metricCode: parsed.data.metricCode,
      },
    })
  )

  revalidateKpi()
  return { ok: true }
}

/** RSC `<form action>` wrapper. */
export async function submitCreateKpiPeriod(formData: FormData) {
  await createKpiPeriodAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitUpsertKpiScore(formData: FormData) {
  await upsertKpiScoreAction(undefined, formData)
}
