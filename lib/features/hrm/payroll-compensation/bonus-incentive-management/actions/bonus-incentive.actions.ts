"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import {
  BONUS_PAYOUT_APPROVAL_SUBJECT_KIND,
  HRM_BONUS_INCENTIVE_AUDIT,
} from "../bonus-incentive.contract"
import {
  adjustBonusPayoutMutation,
  approveBonusPayoutMutation,
  assignBonusEmployeeMutation,
  calculateBonusCyclePayoutsMutation,
  createBonusCycleMutation,
  createBonusPlanMutation,
  exportBonusPayoutToPayrollMutation,
  lockBonusPayoutMutation,
  recordBonusClawbackMutation,
  rejectBonusPayoutMutation,
  returnBonusPayoutMutation,
  setBonusPayoutApprovalRequested,
  upsertBonusTargetMutation,
} from "../data/bonus-incentive.mutations.server"
import { getBonusPayoutForOrganization } from "../data/bonus-incentive.queries.server"
import {
  adjustBonusPayoutFormSchema,
  assignBonusEmployeeFormSchema,
  bonusPayoutDecisionFormSchema,
  bonusPayoutRejectFormSchema,
  calculateBonusCycleFormSchema,
  createBonusCycleFormSchema,
  createBonusPlanFormSchema,
  exportBonusPayoutPayrollFormSchema,
  payoutIdFormSchema,
  recordBonusClawbackFormSchema,
  requestBonusPayoutApprovalFormSchema,
  upsertBonusTargetFormSchema,
} from "../schemas/bonus-incentive.schema"
import type { BonusFormulaConfig } from "../data/bonus-incentive-types.shared"

export type BonusIncentiveFormState =
  | { ok: true }
  | { ok: false; errors: { form?: string } }

function revalidateBonusIncentives() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/bonus-incentives"),
    "layout"
  )
}

function audit(input: {
  readonly action: string
  readonly actorUserId: string
  readonly actorSessionId: string | null
  readonly organizationId: string
  readonly resourceType: string
  readonly resourceId: string
  readonly metadata?: Record<string, unknown>
}) {
  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: input.action,
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    })
  )
}

function splitCsv(value: string | null | undefined): string[] | undefined {
  if (!value) return undefined
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length > 0 ? items : undefined
}

export async function createBonusPlanAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = createBonusPlanFormSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    planType: formData.get("planType"),
    payoutFormulaType: formData.get("payoutFormulaType"),
    defaultCurrency: formData.get("defaultCurrency"),
    defaultPayrollLineCode: formData.get("defaultPayrollLineCode"),
    fixedAmount: formData.get("fixedAmount") || undefined,
    salaryPercent: formData.get("salaryPercent") || undefined,
    capAmount: formData.get("capAmount") || undefined,
    floorAmount: formData.get("floorAmount") || undefined,
    guaranteedAmount: formData.get("guaranteedAmount") || undefined,
    minTenureMonths: formData.get("minTenureMonths") || undefined,
    employmentTypes: formData.get("employmentTypes"),
    employeeStatuses: formData.get("employeeStatuses"),
    costCenterCode: formData.get("costCenterCode"),
    glReference: formData.get("glReference"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const data = parsed.data
  const formulaConfig: BonusFormulaConfig = {
    ...(data.fixedAmount && {
      fixedAmount: Number.parseFloat(data.fixedAmount),
    }),
    ...(data.salaryPercent && {
      salaryPercent: Number.parseFloat(data.salaryPercent),
    }),
  }
  const eligibilityRules = {
    ...(data.minTenureMonths != null && {
      minTenureMonths: data.minTenureMonths,
    }),
    ...(data.employmentTypes && {
      employmentTypes: splitCsv(data.employmentTypes),
    }),
    ...(data.employeeStatuses && {
      employeeStatuses: splitCsv(data.employeeStatuses),
    }),
  }
  const accountingAllocation =
    data.costCenterCode || data.glReference
      ? {
          costCenterCode: data.costCenterCode ?? null,
          glReference: data.glReference ?? null,
        }
      : null

  const { id } = await createBonusPlanMutation({
    organizationId: gate.session.organizationId,
    code: data.code,
    name: data.name,
    description: data.description ?? null,
    planType: data.planType,
    payoutFormulaType: data.payoutFormulaType,
    payoutFormulaConfig: formulaConfig,
    eligibilityRules,
    capAmount: data.capAmount ?? null,
    floorAmount: data.floorAmount ?? null,
    guaranteedAmount: data.guaranteedAmount ?? null,
    defaultCurrency: data.defaultCurrency,
    defaultPayrollLineCode: data.defaultPayrollLineCode,
    accountingAllocation,
    actorUserId: gate.session.userId,
  })

  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.planCreate,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_plan",
    resourceId: id,
    metadata: { code: data.code, planType: data.planType },
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function createBonusCycleAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = createBonusCycleFormSchema.safeParse({
    planId: formData.get("planId"),
    code: formData.get("code"),
    name: formData.get("name"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    cutoffDate: formData.get("cutoffDate") || undefined,
    approvalDate: formData.get("approvalDate") || undefined,
    payoutDate: formData.get("payoutDate"),
    payrollPeriodId: formData.get("payrollPeriodId") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }

  const { id } = await createBonusCycleMutation({
    organizationId: gate.session.organizationId,
    planId: parsed.data.planId,
    code: parsed.data.code,
    name: parsed.data.name,
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    cutoffDate: parsed.data.cutoffDate ?? null,
    approvalDate: parsed.data.approvalDate ?? null,
    payoutDate: parsed.data.payoutDate,
    payrollPeriodId: parsed.data.payrollPeriodId ?? null,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.cycleCreate,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_cycle",
    resourceId: id,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function assignBonusEmployeeAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = assignBonusEmployeeFormSchema.safeParse({
    planId: formData.get("planId"),
    cycleId: formData.get("cycleId"),
    employeeId: formData.get("employeeId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const { id, eligibilityState } = await assignBonusEmployeeMutation({
    organizationId: gate.session.organizationId,
    planId: parsed.data.planId,
    cycleId: parsed.data.cycleId,
    employeeId: parsed.data.employeeId,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.assignmentCreate,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_assignment",
    resourceId: id,
    metadata: { eligibilityState },
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function upsertBonusTargetAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = upsertBonusTargetFormSchema.safeParse({
    cycleId: formData.get("cycleId"),
    assignmentId: formData.get("assignmentId") || undefined,
    employeeId: formData.get("employeeId") || undefined,
    targetScope: formData.get("targetScope"),
    targetMetric: formData.get("targetMetric"),
    targetValue: formData.get("targetValue"),
    actualValue: formData.get("actualValue") || undefined,
    weight: formData.get("weight") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const { id } = await upsertBonusTargetMutation({
    organizationId: gate.session.organizationId,
    cycleId: parsed.data.cycleId,
    assignmentId: parsed.data.assignmentId ?? null,
    employeeId: parsed.data.employeeId ?? null,
    targetScope: parsed.data.targetScope,
    targetMetric: parsed.data.targetMetric,
    targetValue: parsed.data.targetValue,
    actualValue: parsed.data.actualValue ?? null,
    weight: parsed.data.weight ?? null,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.targetUpsert,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_target",
    resourceId: id,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function calculateBonusCycleAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = calculateBonusCycleFormSchema.safeParse({
    cycleId: formData.get("cycleId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const result = await calculateBonusCyclePayoutsMutation({
    organizationId: gate.session.organizationId,
    cycleId: parsed.data.cycleId,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutCalculate,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_cycle",
    resourceId: parsed.data.cycleId,
    metadata: { payoutCount: result.payoutCount },
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function adjustBonusPayoutAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = adjustBonusPayoutFormSchema.safeParse({
    payoutId: formData.get("payoutId"),
    adjustmentType: formData.get("adjustmentType"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    approvalReference: formData.get("approvalReference"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const { id } = await adjustBonusPayoutMutation({
    organizationId: gate.session.organizationId,
    payoutId: parsed.data.payoutId,
    adjustmentType: parsed.data.adjustmentType,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    approvalReference: parsed.data.approvalReference ?? null,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutAdjust,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_adjustment",
    resourceId: id,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function requestBonusPayoutApprovalAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = requestBonusPayoutApprovalFormSchema.safeParse({
    payoutId: formData.get("payoutId"),
    approverUserId: formData.get("approverUserId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const payout = await getBonusPayoutForOrganization(
    gate.session.organizationId,
    parsed.data.payoutId
  )
  if (!payout) return hrmActionFailure({ form: "Bonus payout not found." })
  if (payout.validationFlags.length > 0) {
    return hrmActionFailure({
      form: "Resolve payout validation flags before requesting approval.",
    })
  }

  const approvalId = crypto.randomUUID()
  await db.insert(hrmApproval).values({
    id: approvalId,
    organizationId: gate.session.organizationId,
    subjectKind: BONUS_PAYOUT_APPROVAL_SUBJECT_KIND,
    subjectId: parsed.data.payoutId,
    state: "pending",
    requestedByUserId: gate.session.userId,
    currentApproverUserId: parsed.data.approverUserId ?? null,
    snapshot: {
      payoutId: payout.id,
      employeeId: payout.employeeId,
      planName: payout.planName,
      cycleName: payout.cycleName,
      calculatedAmount: payout.calculatedAmount,
      adjustedAmount: payout.adjustedAmount,
      currency: payout.currency,
    },
    createdByUserId: gate.session.userId,
    updatedByUserId: gate.session.userId,
  })
  await setBonusPayoutApprovalRequested({
    organizationId: gate.session.organizationId,
    payoutId: parsed.data.payoutId,
    approvalId,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutRequestApproval,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: { subjectKind: BONUS_PAYOUT_APPROVAL_SUBJECT_KIND },
  })
  revalidateBonusIncentives()
  return { ok: true }
}

async function loadBonusApproval(organizationId: string, approvalId: string) {
  const rows = await db
    .select({
      id: hrmApproval.id,
      subjectKind: hrmApproval.subjectKind,
      subjectId: hrmApproval.subjectId,
      state: hrmApproval.state,
      requestedByUserId: hrmApproval.requestedByUserId,
    })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, organizationId),
        eq(hrmApproval.id, approvalId)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

export async function approveBonusPayoutApprovalAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = bonusPayoutDecisionFormSchema.safeParse({
    approvalId: formData.get("approvalId"),
    decisionNote: formData.get("decisionNote"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const approval = await loadBonusApproval(
    gate.session.organizationId,
    parsed.data.approvalId
  )
  if (
    !approval ||
    approval.subjectKind !== BONUS_PAYOUT_APPROVAL_SUBJECT_KIND
  ) {
    return hrmActionFailure({ form: "Bonus payout approval not found." })
  }
  if (approval.state !== "pending") {
    return hrmActionFailure({ form: "Approval is not pending." })
  }
  if (approval.requestedByUserId === gate.session.userId) {
    return hrmActionFailure({
      form: "Requester cannot approve their own payout.",
    })
  }

  await db
    .update(hrmApproval)
    .set({
      state: "approved",
      decisionByUserId: gate.session.userId,
      decisionAt: new Date(),
      decisionNote: parsed.data.decisionNote ?? null,
      updatedByUserId: gate.session.userId,
      updatedAt: new Date(),
    })
    .where(eq(hrmApproval.id, parsed.data.approvalId))
  await approveBonusPayoutMutation({
    organizationId: gate.session.organizationId,
    payoutId: approval.subjectId,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutApprove,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_payout",
    resourceId: approval.subjectId,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function rejectBonusPayoutApprovalAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = bonusPayoutRejectFormSchema.safeParse({
    approvalId: formData.get("approvalId"),
    reason: formData.get("reason"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const approval = await loadBonusApproval(
    gate.session.organizationId,
    parsed.data.approvalId
  )
  if (
    !approval ||
    approval.subjectKind !== BONUS_PAYOUT_APPROVAL_SUBJECT_KIND
  ) {
    return hrmActionFailure({ form: "Bonus payout approval not found." })
  }
  await db
    .update(hrmApproval)
    .set({
      state: "rejected",
      decisionByUserId: gate.session.userId,
      decisionAt: new Date(),
      decisionNote: parsed.data.reason,
      updatedByUserId: gate.session.userId,
      updatedAt: new Date(),
    })
    .where(eq(hrmApproval.id, parsed.data.approvalId))
  await rejectBonusPayoutMutation({
    organizationId: gate.session.organizationId,
    payoutId: approval.subjectId,
    reason: parsed.data.reason,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutReject,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_payout",
    resourceId: approval.subjectId,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function returnBonusPayoutAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = bonusPayoutRejectFormSchema.safeParse({
    approvalId: formData.get("approvalId"),
    reason: formData.get("reason"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const approval = await loadBonusApproval(
    gate.session.organizationId,
    parsed.data.approvalId
  )
  if (
    !approval ||
    approval.subjectKind !== BONUS_PAYOUT_APPROVAL_SUBJECT_KIND
  ) {
    return hrmActionFailure({ form: "Bonus payout approval not found." })
  }
  await db
    .update(hrmApproval)
    .set({
      state: "rejected",
      decisionByUserId: gate.session.userId,
      decisionAt: new Date(),
      decisionNote: `Returned: ${parsed.data.reason}`,
      updatedByUserId: gate.session.userId,
      updatedAt: new Date(),
    })
    .where(eq(hrmApproval.id, parsed.data.approvalId))
  await returnBonusPayoutMutation({
    organizationId: gate.session.organizationId,
    payoutId: approval.subjectId,
    reason: parsed.data.reason,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutReturn,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_payout",
    resourceId: approval.subjectId,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function lockBonusPayoutAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = payoutIdFormSchema.safeParse({
    payoutId: formData.get("payoutId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  await lockBonusPayoutMutation({
    organizationId: gate.session.organizationId,
    payoutId: parsed.data.payoutId,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutLock,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_payout",
    resourceId: parsed.data.payoutId,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function exportBonusPayoutToPayrollAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = exportBonusPayoutPayrollFormSchema.safeParse({
    payoutId: formData.get("payoutId"),
    payrollPeriodId: formData.get("payrollPeriodId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  await exportBonusPayoutToPayrollMutation({
    organizationId: gate.session.organizationId,
    payoutId: parsed.data.payoutId,
    payrollPeriodId: parsed.data.payrollPeriodId,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.payoutExportPayroll,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_payout",
    resourceId: parsed.data.payoutId,
    metadata: { payrollPeriodId: parsed.data.payrollPeriodId },
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function recordBonusClawbackAction(
  formData: FormData
): Promise<BonusIncentiveFormState> {
  const gate = await requireHrmPermission({
    object: "bonus_incentive",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const parsed = recordBonusClawbackFormSchema.safeParse({
    payoutId: formData.get("payoutId"),
    clawbackType: formData.get("clawbackType"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    recoveryReference: formData.get("recoveryReference"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: parsed.error.issues[0]?.message })
  }
  const { id } = await recordBonusClawbackMutation({
    organizationId: gate.session.organizationId,
    payoutId: parsed.data.payoutId,
    clawbackType: parsed.data.clawbackType,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    recoveryReference: parsed.data.recoveryReference ?? null,
    actorUserId: gate.session.userId,
  })
  audit({
    action: HRM_BONUS_INCENTIVE_AUDIT.clawbackRecord,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "hrm_bonus_clawback",
    resourceId: id,
  })
  revalidateBonusIncentives()
  return { ok: true }
}

export async function submitCreateBonusPlan(formData: FormData) {
  await createBonusPlanAction(formData)
}

export async function submitCreateBonusCycle(formData: FormData) {
  await createBonusCycleAction(formData)
}

export async function submitAssignBonusEmployee(formData: FormData) {
  await assignBonusEmployeeAction(formData)
}

export async function submitUpsertBonusTarget(formData: FormData) {
  await upsertBonusTargetAction(formData)
}

export async function submitCalculateBonusCycle(formData: FormData) {
  await calculateBonusCycleAction(formData)
}

export async function submitAdjustBonusPayout(formData: FormData) {
  await adjustBonusPayoutAction(formData)
}

export async function submitRequestBonusPayoutApproval(formData: FormData) {
  await requestBonusPayoutApprovalAction(formData)
}

export async function submitApproveBonusPayoutApproval(formData: FormData) {
  await approveBonusPayoutApprovalAction(formData)
}

export async function submitRejectBonusPayoutApproval(formData: FormData) {
  await rejectBonusPayoutApprovalAction(formData)
}

export async function submitReturnBonusPayout(formData: FormData) {
  await returnBonusPayoutAction(formData)
}

export async function submitLockBonusPayout(formData: FormData) {
  await lockBonusPayoutAction(formData)
}

export async function submitExportBonusPayoutToPayroll(formData: FormData) {
  await exportBonusPayoutToPayrollAction(formData)
}

export async function submitRecordBonusClawback(formData: FormData) {
  await recordBonusClawbackAction(formData)
}
