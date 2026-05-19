import "server-only"

import { and, eq, gte, isNull, lte, or } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmDocument,
  hrmDocumentRequirement,
  hrmDocumentRetentionRule,
  hrmEmployee,
} from "#lib/db/schema"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  canEmployeeAccessDocument,
  deriveHrmDocumentGroup,
  readinessStateForDocument,
  type HrmDocumentReadinessState,
} from "./hrm-document-governance.shared"

type ActiveDocumentRequirementRow = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly documentType: string
  readonly documentGroup: string
  readonly isMandatory: boolean
  readonly allowEmployeeSubmission: boolean
  readonly allowEmployeeAccess: boolean
  readonly requiresExpiryDate: boolean
  readonly retentionPolicyCode: string | null
}

type EmployeeDocumentForReadiness = {
  readonly id: string
  readonly documentType: string
  readonly verificationStatus: string
  readonly documentLifecycleStatus: string
  readonly effectiveTo: Date | null
  readonly isLatestVersion: boolean
}

function pushSqlPredicate(predicates: SQL[], predicate: SQL | undefined): void {
  if (predicate) {
    predicates.push(predicate)
  }
}

export type EmployeeDocumentReadinessRequirement = {
  readonly requirementId: string
  readonly code: string
  readonly name: string
  readonly documentType: string
  readonly documentGroup: string
  readonly state: HrmDocumentReadinessState
  readonly documentId: string | null
  readonly isMandatory: boolean
}

export type EmployeeDocumentReadinessSummary = {
  readonly employeeId: string
  readonly ready: boolean
  readonly requiredCount: number
  readonly readyCount: number
  readonly missingCount: number
  readonly pendingCount: number
  readonly rejectedCount: number
  readonly expiredCount: number
  readonly requirements: readonly EmployeeDocumentReadinessRequirement[]
}

function activeAtPredicates(now: Date): SQL[] {
  const predicates: SQL[] = [eq(hrmDocumentRequirement.status, "active")]
  pushSqlPredicate(
    predicates,
    or(
      isNull(hrmDocumentRequirement.effectiveFrom),
      lte(hrmDocumentRequirement.effectiveFrom, now)
    )
  )
  pushSqlPredicate(
    predicates,
    or(
      isNull(hrmDocumentRequirement.effectiveTo),
      gte(hrmDocumentRequirement.effectiveTo, now)
    )
  )
  return predicates
}

export async function listActiveDocumentRequirements(input: {
  organizationId: string
  documentType?: string
  now?: Date
}): Promise<readonly ActiveDocumentRequirementRow[]> {
  const now = input.now ?? new Date()
  const predicates: SQL[] = [
    eq(hrmDocumentRequirement.organizationId, input.organizationId),
    ...activeAtPredicates(now),
  ]
  if (input.documentType) {
    predicates.push(eq(hrmDocumentRequirement.documentType, input.documentType))
  }

  return db
    .select({
      id: hrmDocumentRequirement.id,
      code: hrmDocumentRequirement.code,
      name: hrmDocumentRequirement.name,
      documentType: hrmDocumentRequirement.documentType,
      documentGroup: hrmDocumentRequirement.documentGroup,
      isMandatory: hrmDocumentRequirement.isMandatory,
      allowEmployeeSubmission: hrmDocumentRequirement.allowEmployeeSubmission,
      allowEmployeeAccess: hrmDocumentRequirement.allowEmployeeAccess,
      requiresExpiryDate: hrmDocumentRequirement.requiresExpiryDate,
      retentionPolicyCode: hrmDocumentRequirement.retentionPolicyCode,
    })
    .from(hrmDocumentRequirement)
    .where(and(...predicates))
}

export async function findEmployeeSubmissionRequirement(input: {
  organizationId: string
  documentType: string
  now?: Date
}): Promise<ActiveDocumentRequirementRow | null> {
  const requirements = await listActiveDocumentRequirements({
    organizationId: input.organizationId,
    documentType: input.documentType,
    now: input.now,
  })
  return requirements.find((row) => row.allowEmployeeSubmission) ?? null
}

export async function requirementAllowsEmployeeDocumentAccess(input: {
  organizationId: string
  documentType: string
  now?: Date
}): Promise<boolean> {
  const requirements = await listActiveDocumentRequirements({
    organizationId: input.organizationId,
    documentType: input.documentType,
    now: input.now,
  })
  return requirements.some((row) => row.allowEmployeeAccess)
}

export async function canEmployeePortalAccessDocument(input: {
  organizationId: string
  employeeId: string
  documentId: string
  now?: Date
}): Promise<
  | { ok: true; document: { id: string; blobUrl: string } }
  | { ok: false; reason: "not_found" | "not_allowed" }
> {
  const [document] = await db
    .select({
      id: hrmDocument.id,
      blobUrl: hrmDocument.blobUrl,
      employeeId: hrmDocument.employeeId,
      documentType: hrmDocument.documentType,
      classification: hrmDocument.classification,
      documentLifecycleStatus: hrmDocument.documentLifecycleStatus,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, input.organizationId),
        eq(hrmDocument.employeeId, input.employeeId),
        eq(hrmDocument.id, input.documentId),
        eq(hrmDocument.isLatestVersion, true),
        or(
          eq(hrmDocument.documentLifecycleStatus, "active"),
          eq(hrmDocument.documentLifecycleStatus, "archived")
        )
      )
    )
    .limit(1)

  if (!document) {
    return { ok: false, reason: "not_found" }
  }

  const requirementAllowsEmployeeAccess =
    await requirementAllowsEmployeeDocumentAccess({
      organizationId: input.organizationId,
      documentType: document.documentType,
      now: input.now,
    })
  if (
    !canEmployeeAccessDocument({
      classification: document.classification,
      requirementAllowsEmployeeAccess,
    })
  ) {
    return { ok: false, reason: "not_allowed" }
  }

  return { ok: true, document: { id: document.id, blobUrl: document.blobUrl } }
}

export async function getEmployeeDocumentReadiness(input: {
  organizationId: string
  employeeId: string
  now?: Date
}): Promise<EmployeeDocumentReadinessSummary | null> {
  const now = input.now ?? new Date()
  const [employee] = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  if (!employee) return null

  const [requirements, documents] = await Promise.all([
    listActiveDocumentRequirements({
      organizationId: input.organizationId,
      now,
    }),
    db
      .select({
        id: hrmDocument.id,
        documentType: hrmDocument.documentType,
        verificationStatus: hrmDocument.verificationStatus,
        documentLifecycleStatus: hrmDocument.documentLifecycleStatus,
        effectiveTo: hrmDocument.effectiveTo,
        isLatestVersion: hrmDocument.isLatestVersion,
      })
      .from(hrmDocument)
      .where(
        and(
          eq(hrmDocument.organizationId, input.organizationId),
          eq(hrmDocument.employeeId, input.employeeId),
          eq(hrmDocument.isLatestVersion, true)
        )
      ),
  ])

  const latestByType = new Map<string, EmployeeDocumentForReadiness>()
  for (const document of documents) {
    if (document.documentLifecycleStatus === "deleted") continue
    latestByType.set(document.documentType, document)
  }

  const required = requirements.filter((row) => row.isMandatory)
  const requirementStates = required.map((requirement) => {
    const document = latestByType.get(requirement.documentType) ?? null
    const state = document
      ? readinessStateForDocument({
          verificationStatus: document.verificationStatus,
          documentLifecycleStatus: document.documentLifecycleStatus,
          effectiveTo: document.effectiveTo,
          now,
        })
      : "missing"

    return {
      requirementId: requirement.id,
      code: requirement.code,
      name: requirement.name,
      documentType: requirement.documentType,
      documentGroup:
        requirement.documentGroup ||
        deriveHrmDocumentGroup(requirement.documentType),
      state,
      documentId: document?.id ?? null,
      isMandatory: requirement.isMandatory,
    } satisfies EmployeeDocumentReadinessRequirement
  })

  const readyCount = requirementStates.filter(
    (row) => row.state === "ready"
  ).length
  const missingCount = requirementStates.filter(
    (row) => row.state === "missing"
  ).length
  const pendingCount = requirementStates.filter(
    (row) => row.state === "pending_verification"
  ).length
  const rejectedCount = requirementStates.filter(
    (row) => row.state === "rejected"
  ).length
  const expiredCount = requirementStates.filter(
    (row) => row.state === "expired"
  ).length

  return {
    employeeId: employee.id,
    ready:
      missingCount === 0 &&
      pendingCount === 0 &&
      rejectedCount === 0 &&
      expiredCount === 0,
    requiredCount: requirementStates.length,
    readyCount,
    missingCount,
    pendingCount,
    rejectedCount,
    expiredCount,
    requirements: requirementStates,
  }
}

export async function listRetentionDueDocuments(input: {
  organizationId: string
  now?: Date
  limit?: number
}): Promise<
  readonly {
    id: string
    employeeId: string | null
    documentType: string
    retentionPolicyCode: string | null
    retentionUntil: Date
  }[]
> {
  const now = input.now ?? new Date()
  return db
    .select({
      id: hrmDocument.id,
      employeeId: hrmDocument.employeeId,
      documentType: hrmDocument.documentType,
      retentionPolicyCode: hrmDocument.retentionPolicyCode,
      retentionUntil: hrmDocument.retentionUntil,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, input.organizationId),
        lte(hrmDocument.retentionUntil, now),
        or(
          eq(hrmDocument.documentLifecycleStatus, "active"),
          eq(hrmDocument.documentLifecycleStatus, "archived")
        )
      )
    )
    .limit(Math.min(Math.max(input.limit ?? 100, 1), 500))
    .then((rows) =>
      rows.filter(
        (row): row is typeof row & { retentionUntil: Date } =>
          row.retentionUntil instanceof Date
      )
    )
}

export async function findRetentionRule(input: {
  organizationId: string
  retentionPolicyCode: string | null
  documentType: string
  documentGroup: string | null
}): Promise<{
  code: string
  retentionPeriodDays: number
  deleteAfterRetention: boolean
} | null> {
  const predicates: SQL[] = [
    eq(hrmDocumentRetentionRule.organizationId, input.organizationId),
    eq(hrmDocumentRetentionRule.status, "active"),
  ]
  if (input.retentionPolicyCode) {
    predicates.push(
      eq(hrmDocumentRetentionRule.code, input.retentionPolicyCode)
    )
  } else {
    pushSqlPredicate(
      predicates,
      or(
        eq(hrmDocumentRetentionRule.documentType, input.documentType),
        eq(
          hrmDocumentRetentionRule.documentGroup,
          input.documentGroup ?? deriveHrmDocumentGroup(input.documentType)
        )
      )
    )
  }

  const [rule] = await db
    .select({
      code: hrmDocumentRetentionRule.code,
      retentionPeriodDays: hrmDocumentRetentionRule.retentionPeriodDays,
      deleteAfterRetention: hrmDocumentRetentionRule.deleteAfterRetention,
    })
    .from(hrmDocumentRetentionRule)
    .where(and(...predicates))
    .limit(1)

  return rule ?? null
}

export async function canUploadHrmDocumentForUser(input: {
  organizationId: string
  userId: string
  employeeId: string
}): Promise<boolean> {
  const allowed = await canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: {
      module: "hrm",
      object: "document",
      function: "create",
    },
  })
  if (!allowed) return false

  const [employee] = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  return Boolean(employee)
}
