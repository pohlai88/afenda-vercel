import "server-only"

import { and, eq } from "drizzle-orm"

import type { db } from "#lib/db"
import { hrmComplianceObligation } from "#lib/db/schema"

export type HrmComplianceObligationDbExecutor = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export type UpsertComplianceObligationInput = {
  readonly id?: string
  readonly organizationId: string
  readonly code: string
  readonly title: string
  readonly description?: string | null
  readonly complianceArea: string
  readonly requirementKind: string
  readonly countryCode?: string | null
  readonly legalEntityCode?: string | null
  readonly departmentId?: string | null
  readonly workLocationCode?: string | null
  readonly employmentType?: string | null
  readonly workerCategory?: string | null
  readonly policyId?: string | null
  readonly policyVersion?: string | null
  readonly acknowledgementDeadline?: Date | null
  readonly dueDate?: Date | null
  readonly alertLeadDays?: number | null
  readonly sourceReferenceId?: string | null
  readonly metadata?: Record<string, unknown> | null
  readonly effectiveFrom?: Date | null
  readonly effectiveTo?: Date | null
  readonly actorUserId: string
}

export async function upsertComplianceObligation(
  executor: HrmComplianceObligationDbExecutor,
  input: UpsertComplianceObligationInput
): Promise<string> {
  const id = input.id ?? crypto.randomUUID()
  const now = new Date()

  const payload = {
    id,
    organizationId: input.organizationId,
    code: input.code,
    title: input.title,
    description: input.description ?? null,
    complianceArea: input.complianceArea,
    requirementKind: input.requirementKind,
    status: "active",
    countryCode: input.countryCode ?? null,
    legalEntityCode: input.legalEntityCode ?? null,
    departmentId: input.departmentId ?? null,
    workLocationCode: input.workLocationCode ?? null,
    employmentType: input.employmentType ?? null,
    workerCategory: input.workerCategory ?? null,
    policyId: input.policyId ?? null,
    policyVersion: input.policyVersion ?? null,
    acknowledgementDeadline: input.acknowledgementDeadline ?? null,
    dueDate: input.dueDate ?? null,
    alertLeadDays: input.alertLeadDays ?? 7,
    sourceReferenceId: input.sourceReferenceId ?? null,
    metadata: input.metadata ?? null,
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveTo: input.effectiveTo ?? null,
    updatedAt: now,
    updatedByUserId: input.actorUserId,
  } as const

  if (!input.id) {
    await executor.insert(hrmComplianceObligation).values({
      ...payload,
      createdByUserId: input.actorUserId,
    })
    return id
  }

  await executor
    .update(hrmComplianceObligation)
    .set(payload)
    .where(
      and(
        eq(hrmComplianceObligation.organizationId, input.organizationId),
        eq(hrmComplianceObligation.id, input.id)
      )
    )

  return id
}

export async function archiveComplianceObligation(
  executor: HrmComplianceObligationDbExecutor,
  input: {
    readonly organizationId: string
    readonly obligationId: string
    readonly actorUserId: string
  }
): Promise<boolean> {
  const updated = await executor
    .update(hrmComplianceObligation)
    .set({
      status: "archived",
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmComplianceObligation.organizationId, input.organizationId),
        eq(hrmComplianceObligation.id, input.obligationId)
      )
    )
    .returning({ id: hrmComplianceObligation.id })

  return updated.length > 0
}
