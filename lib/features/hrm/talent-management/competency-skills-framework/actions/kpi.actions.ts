"use server"

import { createHash } from "node:crypto"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { requireErpPermission } from "#features/erp-rbac/server"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_APPS_HRM_KPI } from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmKpiMetric,
  hrmKpiPeriod,
  hrmKpiScore,
} from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import type { OrgSession } from "#lib/auth"

import { buildKpiEvidenceSnapshotForPeriod } from "../data/kpi.queries.server"
import { requireHrmOrgTenantFromForm } from "../../../_module-governance/hrm-action-guard.server"
import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import {
  activateKpiPeriodFormSchema,
  archiveKpiMetricFormSchema,
  calculateTypedKpiScore,
  closeKpiPeriodFormSchema,
  createKpiMetricFormSchema,
  createKpiPeriodFormSchema,
  formatKpiDecimal,
  kpiMetricAggregationSchema,
  kpiMetricDirectionSchema,
  kpiMetricValueTypeSchema,
  lockKpiPeriodFormSchema,
  normalizeKpiMetricCode,
  upsertKpiScoreFormSchema,
  upsertTypedKpiScoreFormSchema,
  type HrmKpiDirection,
} from "../schemas/kpi.schema"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { ContractMutationFormState } from "../../../types"

const KPI_PERMISSION = {
  module: "hrm",
  object: "kpi",
} as const

function revalidateKpi() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_KPI), "page")
}

async function requireKpiPermission(
  formData: FormData,
  fn: "create" | "update" | "audit"
): Promise<
  | { ok: true; session: OrgSession; orgSlug: string }
  | { ok: false; response: ContractMutationFormState }
> {
  const tenant = await requireHrmOrgTenantFromForm(formData)
  if (!tenant.ok) return { ok: false, response: tenant.response }

  const permission = await requireErpPermission({
    ...KPI_PERMISSION,
    function: fn,
  })
  if (!permission.ok) {
    return { ok: false, response: hrmActionFailure({ form: permission.error }) }
  }

  return { ok: true, session: permission.session, orgSlug: tenant.orgSlug }
}

function evidenceHash(snapshot: unknown): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex")
}

async function getActiveMetricById(input: {
  organizationId: string
  metricId: string
}): Promise<{
  id: string
  code: string
  direction: HrmKpiDirection
  defaultWeight: string
  state: string
} | null> {
  const [metric] = await db
    .select({
      id: hrmKpiMetric.id,
      code: hrmKpiMetric.code,
      direction: hrmKpiMetric.direction,
      defaultWeight: hrmKpiMetric.defaultWeight,
      state: hrmKpiMetric.state,
    })
    .from(hrmKpiMetric)
    .where(
      and(
        eq(hrmKpiMetric.organizationId, input.organizationId),
        eq(hrmKpiMetric.id, input.metricId)
      )
    )
    .limit(1)

  if (!metric) return null
  const direction = kpiMetricDirectionSchema.safeParse(metric.direction)
  if (!direction.success) return null
  return {
    ...metric,
    direction: direction.data,
  }
}

async function getActiveMetricByCode(input: {
  organizationId: string
  code: string
}): Promise<{
  id: string
  code: string
  direction: HrmKpiDirection
  defaultWeight: string
  state: string
} | null> {
  const [metric] = await db
    .select({
      id: hrmKpiMetric.id,
      code: hrmKpiMetric.code,
      direction: hrmKpiMetric.direction,
      defaultWeight: hrmKpiMetric.defaultWeight,
      state: hrmKpiMetric.state,
    })
    .from(hrmKpiMetric)
    .where(
      and(
        eq(hrmKpiMetric.organizationId, input.organizationId),
        eq(hrmKpiMetric.code, input.code)
      )
    )
    .limit(1)

  if (!metric) return null
  const direction = kpiMetricDirectionSchema.safeParse(metric.direction)
  if (!direction.success) return null
  return {
    ...metric,
    direction: direction.data,
  }
}

async function assertActivePeriod(input: {
  organizationId: string
  periodId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [period] = await db
    .select({ id: hrmKpiPeriod.id, state: hrmKpiPeriod.state })
    .from(hrmKpiPeriod)
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, input.organizationId),
        eq(hrmKpiPeriod.id, input.periodId)
      )
    )
    .limit(1)
  if (!period) return { ok: false, message: "KPI period not found." }
  if (period.state !== "active") {
    return {
      ok: false,
      message: "KPI scores can only be edited while the period is active.",
    }
  }
  return { ok: true }
}

export async function createKpiMetricAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session

  const parsed = createKpiMetricFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    code: normalizeKpiMetricCode(String(formData.get("code") ?? "")),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    unit: formData.get("unit") || "count",
    valueType: formData.get("valueType") || "decimal",
    direction: formData.get("direction") || "higher_is_better",
    aggregation: formData.get("aggregation") || "sum",
    defaultWeight: formData.get("defaultWeight") || "1.0000",
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      form:
        fe.code?.[0] ??
        fe.name?.[0] ??
        fe.defaultWeight?.[0] ??
        "Invalid KPI metric.",
    })
  }

  const valueType = kpiMetricValueTypeSchema.parse(parsed.data.valueType)
  const direction = kpiMetricDirectionSchema.parse(parsed.data.direction)
  const aggregation = kpiMetricAggregationSchema.parse(parsed.data.aggregation)
  const metricId = crypto.randomUUID()
  try {
    await db.insert(hrmKpiMetric).values({
      id: metricId,
      organizationId,
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      unit: parsed.data.unit,
      valueType,
      direction,
      aggregation,
      defaultWeight: parsed.data.defaultWeight,
      state: "active",
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  } catch {
    return hrmActionFailure({
      form: "A KPI metric with this code already exists.",
    })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.metric.create",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_metric",
      resourceId: metricId,
      metadata: { code: parsed.data.code, name: parsed.data.name },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function archiveKpiMetricAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session

  const parsed = archiveKpiMetricFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    metricId: formData.get("metricId"),
  })
  if (!parsed.success) return hrmActionFailure({ form: "Invalid metric." })

  const [metric] = await db
    .update(hrmKpiMetric)
    .set({
      state: "archived",
      archivedAt: new Date(),
      archivedByUserId: userId,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmKpiMetric.organizationId, organizationId),
        eq(hrmKpiMetric.id, parsed.data.metricId)
      )
    )
    .returning({ id: hrmKpiMetric.id, code: hrmKpiMetric.code })

  if (!metric) return hrmActionFailure({ form: "KPI metric not found." })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.metric.archive",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_metric",
      resourceId: metric.id,
      metadata: { code: metric.code },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function createKpiPeriodAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session

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

export async function activateKpiPeriodAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session
  const parsed = activateKpiPeriodFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) return hrmActionFailure({ form: "Invalid period." })

  const [period] = await db
    .select({ id: hrmKpiPeriod.id, state: hrmKpiPeriod.state })
    .from(hrmKpiPeriod)
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, organizationId),
        eq(hrmKpiPeriod.id, parsed.data.periodId)
      )
    )
    .limit(1)
  if (!period) return hrmActionFailure({ form: "KPI period not found." })
  if (period.state !== "draft") {
    return hrmActionFailure({
      form: "Only draft KPI periods can be activated.",
    })
  }

  await db
    .update(hrmKpiPeriod)
    .set({
      state: "active",
      activatedAt: new Date(),
      activatedByUserId: userId,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, organizationId),
        eq(hrmKpiPeriod.id, parsed.data.periodId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.period.activate",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_period",
      resourceId: parsed.data.periodId,
      metadata: { periodId: parsed.data.periodId },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function lockKpiPeriodAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session
  const parsed = lockKpiPeriodFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) return hrmActionFailure({ form: "Invalid period." })

  const [period] = await db
    .select({ id: hrmKpiPeriod.id, state: hrmKpiPeriod.state })
    .from(hrmKpiPeriod)
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, organizationId),
        eq(hrmKpiPeriod.id, parsed.data.periodId)
      )
    )
    .limit(1)
  if (!period) return hrmActionFailure({ form: "KPI period not found." })
  if (period.state !== "active") {
    return hrmActionFailure({ form: "Only active KPI periods can be locked." })
  }

  await db
    .update(hrmKpiPeriod)
    .set({
      state: "locked",
      lockedAt: new Date(),
      lockedByUserId: userId,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, organizationId),
        eq(hrmKpiPeriod.id, parsed.data.periodId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.period.lock",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_period",
      resourceId: parsed.data.periodId,
      metadata: { periodId: parsed.data.periodId },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function closeKpiPeriodAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate.session
  const parsed = closeKpiPeriodFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    periodId: formData.get("periodId"),
  })
  if (!parsed.success) return hrmActionFailure({ form: "Invalid period." })

  const [period] = await db
    .select({ id: hrmKpiPeriod.id, state: hrmKpiPeriod.state })
    .from(hrmKpiPeriod)
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, organizationId),
        eq(hrmKpiPeriod.id, parsed.data.periodId)
      )
    )
    .limit(1)
  if (!period) return hrmActionFailure({ form: "KPI period not found." })
  if (period.state !== "locked") {
    return hrmActionFailure({ form: "Only locked KPI periods can be closed." })
  }

  const snapshot = await buildKpiEvidenceSnapshotForPeriod(
    organizationId,
    parsed.data.periodId
  )
  if (!snapshot) return hrmActionFailure({ form: "KPI period not found." })
  const hash = evidenceHash(snapshot)

  await db
    .update(hrmKpiPeriod)
    .set({
      state: "closed",
      closedAt: new Date(),
      closedByUserId: userId,
      evidenceSnapshot: snapshot,
      evidenceHash: hash,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmKpiPeriod.organizationId, organizationId),
        eq(hrmKpiPeriod.id, parsed.data.periodId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.period.close",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_period",
      resourceId: parsed.data.periodId,
      metadata: {
        periodId: parsed.data.periodId,
        evidenceHash: hash,
        scoreCount: snapshot.summary.scoreCount,
      },
    })
  )

  revalidateKpi()
  return { ok: true }
}

async function upsertTypedKpiScore(input: {
  session: OrgSession
  periodId: string
  employeeId: string
  metricId: string
  targetDecimal: string
  achievedDecimal: string
  weight?: string
  notes?: string
}): Promise<ContractMutationFormState> {
  const { organizationId, userId, sessionId } = input.session
  const period = await assertActivePeriod({
    organizationId,
    periodId: input.periodId,
  })
  if (!period.ok) return hrmActionFailure({ form: period.message })

  const [emp] = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)
  if (!emp) return hrmActionFailure({ form: "Employee not found." })

  const metric = await getActiveMetricById({
    organizationId,
    metricId: input.metricId,
  })
  if (!metric) return hrmActionFailure({ form: "KPI metric not found." })
  if (metric.state !== "active") {
    return hrmActionFailure({ form: "Archived KPI metrics cannot be scored." })
  }

  const target = Number(input.targetDecimal)
  const achieved = Number(input.achievedDecimal)
  const weight = Number(input.weight ?? metric.defaultWeight)
  if (![target, achieved, weight].every(Number.isFinite)) {
    return hrmActionFailure({ form: "KPI score input must be numeric." })
  }

  const score = calculateTypedKpiScore({
    target,
    achieved,
    direction: metric.direction,
    weight,
  })
  const now = new Date()
  const rowId = crypto.randomUUID()
  const [upserted] = await db
    .insert(hrmKpiScore)
    .values({
      id: rowId,
      organizationId,
      periodId: input.periodId,
      employeeId: input.employeeId,
      metricId: metric.id,
      metricCode: metric.code,
      targetValue: input.targetDecimal,
      achievedValue: input.achievedDecimal,
      targetNumeric: formatKpiDecimal(target, 6),
      achievedNumeric: formatKpiDecimal(achieved, 6),
      varianceNumeric: formatKpiDecimal(score.variance, 6),
      scorePercent: formatKpiDecimal(score.scorePercent, 4),
      weight: formatKpiDecimal(weight, 4),
      weightedScore: formatKpiDecimal(score.weightedScore, 6),
      notes: input.notes?.trim() || null,
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
        metricId: metric.id,
        targetValue: input.targetDecimal,
        achievedValue: input.achievedDecimal,
        targetNumeric: formatKpiDecimal(target, 6),
        achievedNumeric: formatKpiDecimal(achieved, 6),
        varianceNumeric: formatKpiDecimal(score.variance, 6),
        scorePercent: formatKpiDecimal(score.scorePercent, 4),
        weight: formatKpiDecimal(weight, 4),
        weightedScore: formatKpiDecimal(score.weightedScore, 6),
        notes: input.notes?.trim() || null,
        updatedByUserId: userId,
        updatedAt: now,
      },
    })
    .returning({ id: hrmKpiScore.id })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.kpi.score.upsert",
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_kpi_score",
      resourceId: upserted?.id ?? rowId,
      metadata: {
        periodId: input.periodId,
        employeeId: input.employeeId,
        metricId: metric.id,
        metricCode: metric.code,
        scorePercent: score.scorePercent,
        weightedScore: score.weightedScore,
      },
    })
  )

  revalidateKpi()
  return { ok: true }
}

export async function upsertTypedKpiScoreAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = upsertTypedKpiScoreFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    periodId: formData.get("periodId"),
    employeeId: formData.get("employeeId"),
    metricId: formData.get("metricId"),
    targetDecimal: formData.get("targetDecimal"),
    achievedDecimal: formData.get("achievedDecimal"),
    weight: formData.get("weight") || undefined,
    notes: formData.get("notes") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid KPI score input." })
  }

  return upsertTypedKpiScore({
    session: gate.session,
    ...parsed.data,
  })
}

export async function upsertKpiScoreAction(
  _prev: ContractMutationFormState | undefined,
  formData: FormData
): Promise<ContractMutationFormState> {
  const gate = await requireKpiPermission(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = upsertKpiScoreFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    periodId: formData.get("periodId"),
    employeeId: formData.get("employeeId"),
    metricCode: normalizeKpiMetricCode(
      String(formData.get("metricCode") ?? "")
    ),
    targetValue: formData.get("targetValue"),
    achievedValue: formData.get("achievedValue"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid KPI score input." })
  }
  if (!parsed.data.targetValue || !parsed.data.achievedValue) {
    return hrmActionFailure({
      form: "Typed KPI scores require both target and achieved values.",
    })
  }

  const metric = await getActiveMetricByCode({
    organizationId: gate.session.organizationId,
    code: parsed.data.metricCode,
  })
  if (!metric) {
    return hrmActionFailure({
      form: "Create this metric in the KPI catalog before scoring it.",
    })
  }

  return upsertTypedKpiScore({
    session: gate.session,
    periodId: parsed.data.periodId,
    employeeId: parsed.data.employeeId,
    metricId: metric.id,
    targetDecimal: parsed.data.targetValue,
    achievedDecimal: parsed.data.achievedValue,
    notes: parsed.data.notes,
  })
}

/** RSC `<form action>` wrapper. */
export async function submitCreateKpiMetric(formData: FormData) {
  await createKpiMetricAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitArchiveKpiMetric(formData: FormData) {
  await archiveKpiMetricAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitCreateKpiPeriod(formData: FormData) {
  await createKpiPeriodAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitActivateKpiPeriod(formData: FormData) {
  await activateKpiPeriodAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitLockKpiPeriod(formData: FormData) {
  await lockKpiPeriodAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitCloseKpiPeriod(formData: FormData) {
  await closeKpiPeriodAction(undefined, formData)
}

/** RSC `<form action>` wrapper. */
export async function submitUpsertTypedKpiScore(formData: FormData) {
  await upsertTypedKpiScoreAction(undefined, formData)
}

/** Compatibility wrapper: old forms must resolve an active catalog metric. */
export async function submitUpsertKpiScore(formData: FormData) {
  await upsertKpiScoreAction(undefined, formData)
}
