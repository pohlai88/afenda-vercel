import "server-only"

import { and, eq, inArray, isNotNull, isNull, lte, gte } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmEmploymentContract,
  hrmLifecycleEvent,
  iamAuditEvent,
} from "#lib/db/schema"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"
import { createPlannerSignalFromErpProducer } from "#features/planner/server"

import { organizationHrmEmployeePath } from "../../../constants"
import {
  formatUtcDateOnly,
  isoDateOnlyToUtcDate,
} from "../../../_module-governance/hrm-calendar-dates.server"
import {
  CONTRACT_EXPIRY_WARNING_AUDIT_ACTION,
  CONTRACT_EXPIRY_WATCH_BATCH_LIMIT,
  CONTRACT_EXPIRY_WARN_DAYS,
  type ContractExpiryCandidate,
} from "./contract-expiry-watch.shared"
import { triggerContractExpiryLifecycleTransition } from "./employee-lifecycle.mutations.server"

export type ContractExpiryWatchTickSummary = CronTickScannedEmittedSummary & {
  readonly skippedAlreadyAudited: number
  readonly candidates: readonly ContractExpiryCandidate[]
  readonly contractExpiryTransitions: number
}

async function loadContractsAlreadyEmitted(
  contractIds: readonly string[]
): Promise<ReadonlySet<string>> {
  if (contractIds.length === 0) return new Set()
  const rows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, CONTRACT_EXPIRY_WARNING_AUDIT_ACTION),
        eq(iamAuditEvent.resourceType, "hrm_employment_contract"),
        inArray(iamAuditEvent.resourceId, [...contractIds])
      )
    )
  return new Set(
    rows
      .map((r) => r.resourceId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )
}

/**
 * Lists active fixed-term contracts whose `effectiveTo` falls within the next
 * `CONTRACT_EXPIRY_WARN_DAYS` UTC calendar days (inclusive).
 */
export async function listContractExpiryCandidates(input: {
  now: Date
  batchLimit?: number
}): Promise<ContractExpiryCandidate[]> {
  const limit = input.batchLimit ?? CONTRACT_EXPIRY_WATCH_BATCH_LIMIT
  const startIso = formatUtcDateOnly(input.now)
  const endDate = isoDateOnlyToUtcDate(startIso)
  endDate.setUTCDate(endDate.getUTCDate() + CONTRACT_EXPIRY_WARN_DAYS)

  const rows = await db
    .select({
      contractId: hrmEmploymentContract.id,
      organizationId: hrmEmploymentContract.organizationId,
      employeeId: hrmEmploymentContract.employeeId,
      effectiveTo: hrmEmploymentContract.effectiveTo,
      legalName: hrmEmployee.legalName,
      employeeNumber: hrmEmployee.employeeNumber,
    })
    .from(hrmEmploymentContract)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmEmploymentContract.employeeId),
        eq(hrmEmployee.organizationId, hrmEmploymentContract.organizationId)
      )
    )
    .where(
      and(
        eq(hrmEmploymentContract.state, "active"),
        isNotNull(hrmEmploymentContract.effectiveTo),
        isNull(hrmEmployee.archivedAt),
        gte(hrmEmploymentContract.effectiveTo, isoDateOnlyToUtcDate(startIso)),
        lte(hrmEmploymentContract.effectiveTo, endDate)
      )
    )
    .orderBy(hrmEmploymentContract.effectiveTo)
    .limit(limit)

  return rows
    .filter(
      (row): row is typeof row & { effectiveTo: Date } =>
        row.effectiveTo instanceof Date
    )
    .map((row) => ({
      contractId: row.contractId,
      organizationId: row.organizationId,
      employeeId: row.employeeId,
      effectiveTo: row.effectiveTo,
      legalName: row.legalName,
      employeeNumber: row.employeeNumber,
    }))
}

/**
 * Daily cron — emits `erp.hrm.lifecycle.contract.audit` once per contract
 * and mirrors pressure into Orbit via `createPlannerSignalFromErpProducer`.
 * HRM-LCY-016.
 */
export async function runContractExpiryWatchTick(
  input?: CronTickInput
): Promise<ContractExpiryWatchTickSummary> {
  const now = input?.now ?? new Date()
  const todayLabel = formatUtcDateOnly(now)
  const candidates = await listContractExpiryCandidates({
    now,
    batchLimit: input?.batchLimit ?? CONTRACT_EXPIRY_WATCH_BATCH_LIMIT,
  })

  if (candidates.length === 0) {
    return {
      scanned: 0,
      emitted: 0,
      skippedAlreadyAudited: 0,
      contractExpiryTransitions: 0,
      candidates: [],
    }
  }

  const already = await loadContractsAlreadyEmitted(
    candidates.map((c) => c.contractId)
  )

  let emitted = 0
  let skippedAlreadyAudited = 0
  let contractExpiryTransitions = 0

  for (const c of candidates) {
    if (already.has(c.contractId)) {
      skippedAlreadyAudited += 1
      continue
    }

    try {
      const orgSlug = await getOrganizationSlugById(c.organizationId)
      if (!orgSlug) {
        continue
      }

      const effectiveToLabel = formatUtcDateOnly(c.effectiveTo)
      const isDue = effectiveToLabel <= todayLabel

      if (isDue) {
        const transitionResult = await triggerContractExpiryLifecycleTransition({
          organizationId: c.organizationId,
          employeeId: c.employeeId,
          contractId: c.contractId,
          effectiveDate: c.effectiveTo,
          actorUserId: "system",
          reason: `Contract ${c.contractId} ended on ${effectiveToLabel}.`,
        })
        if (transitionResult === "applied") {
          contractExpiryTransitions += 1
        }
      }

      await writeIamAuditEvent({
        action: CONTRACT_EXPIRY_WARNING_AUDIT_ACTION,
        organizationId: c.organizationId,
        actorUserId: null,
        actorSessionId: null,
        resourceType: "hrm_employment_contract",
        resourceId: c.contractId,
        metadata: {
          employeeId: c.employeeId,
          effectiveTo: effectiveToLabel,
        },
      })

      await db.insert(hrmLifecycleEvent).values({
        id: crypto.randomUUID(),
        organizationId: c.organizationId,
        employeeId: c.employeeId,
        kind: "contract_expiry_warning",
        effectiveDate: c.effectiveTo,
        metadata: {
          contractId: c.contractId,
          effectiveTo: effectiveToLabel,
        },
        actorUserId: null,
        isEffectiveDated: true,
      })

      const href = organizationHrmEmployeePath(orgSlug, c.employeeId) as string
      const label = c.employeeNumber
        ? `${c.legalName} (${c.employeeNumber})`
        : c.legalName

      await createPlannerSignalFromErpProducer({
        organizationId: c.organizationId,
        title: `Contract expires ${effectiveToLabel}`,
        description: `Review or renew employment contract for ${label}.`,
        signalClass: "review",
        originatingSystem: "hrm.contract_expiry_watch",
        module: "hrm",
        entityType: "hrm_employment_contract",
        entityId: c.contractId,
        displayLabel: label,
        href,
        causalityReason:
          "Active fixed-term contract has an end date within the 30-day alert window.",
        actorUserId: null,
        pressure: { urgency: 0.65, impact: 0.6 },
        auditMetadata: {
          employeeId: c.employeeId,
          effectiveTo: effectiveToLabel,
        },
      })

      emitted += 1
    } catch {
      // Best-effort tick — partial progress visible via `emitted`.
    }
  }

  return {
    scanned: candidates.length,
    emitted,
    skippedAlreadyAudited,
    contractExpiryTransitions,
    candidates,
  }
}
