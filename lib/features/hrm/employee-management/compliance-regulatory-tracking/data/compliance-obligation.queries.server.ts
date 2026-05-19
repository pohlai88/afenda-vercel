import "server-only"

import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmComplianceObligation } from "#lib/db/schema"

import type {
  HrmComplianceObligationKind,
  HrmComplianceObligationStatus,
} from "./compliance-obligation.shared"

export type ComplianceObligationRow = {
  readonly id: string
  readonly organizationId: string
  readonly code: string
  readonly title: string
  readonly description: string | null
  readonly complianceArea: string
  readonly requirementKind: string
  readonly status: string
  readonly countryCode: string | null
  readonly legalEntityCode: string | null
  readonly departmentId: string | null
  readonly workLocationCode: string | null
  readonly employmentType: string | null
  readonly workerCategory: string | null
  readonly policyId: string | null
  readonly policyVersion: string | null
  readonly acknowledgementDeadline: Date | null
  readonly dueDate: Date | null
  readonly alertLeadDays: number
  readonly sourceReferenceId: string | null
  readonly metadata: Record<string, unknown> | null
  readonly effectiveFrom: Date | null
  readonly effectiveTo: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

type ListComplianceObligationsInput = {
  readonly organizationId: string
  readonly kind?: HrmComplianceObligationKind
  readonly status?: HrmComplianceObligationStatus
  readonly now?: Date
}

function activeAtPredicates(now: Date) {
  return [
    or(
      isNull(hrmComplianceObligation.effectiveFrom),
      lte(hrmComplianceObligation.effectiveFrom, now)
    ),
    or(
      isNull(hrmComplianceObligation.effectiveTo),
      gte(hrmComplianceObligation.effectiveTo, now)
    ),
  ] as const
}

export async function listComplianceObligationsForOrg(
  input: ListComplianceObligationsInput
): Promise<ComplianceObligationRow[]> {
  const now = input.now ?? new Date()

  return db
    .select()
    .from(hrmComplianceObligation)
    .where(
      and(
        eq(hrmComplianceObligation.organizationId, input.organizationId),
        ...(input.kind
          ? [eq(hrmComplianceObligation.requirementKind, input.kind)]
          : []),
        ...(input.status
          ? [eq(hrmComplianceObligation.status, input.status)]
          : []),
        ...activeAtPredicates(now)
      )
    )
}

/** Full obligation registry for operator configuration (HRM-CMP-001). */
export async function listComplianceObligationRegistryForOrg(
  organizationId: string
): Promise<ComplianceObligationRow[]> {
  return db
    .select()
    .from(hrmComplianceObligation)
    .where(eq(hrmComplianceObligation.organizationId, organizationId))
    .orderBy(asc(hrmComplianceObligation.code))
}

export async function listActivePolicyAcknowledgementObligations(input: {
  readonly organizationId: string
  readonly now?: Date
}): Promise<ComplianceObligationRow[]> {
  return listComplianceObligationsForOrg({
    organizationId: input.organizationId,
    kind: "policy_acknowledgement",
    status: "active",
    now: input.now,
  })
}
