"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  fetchRunsForStatutoryPack,
  listComplianceEvidenceForPeriod,
} from "../data/compliance.queries.server"
import {
  upsertComplianceEvidenceMutation,
  updateComplianceSubmissionStateMutation,
} from "../data/compliance.mutations.server"
import type { EvidenceRegenerationSnapshot } from "../data/compliance.mutations.server"
import { STATUTORY_PACK_REGENERATE_AUDIT_ACTION } from "../data/compliance-timeline.shared"
import { buildStatutoryPackFromRuns } from "../data/statutory-pack.server"
import {
  getPayrollPeriod,
  getPayrollPeriodPrimaryCountryCode,
} from "../data/payroll.queries.server"
import { resolveRulePack } from "../data/payroll-rule-pack.server"
import type { StatutoryPackType } from "../data/payroll-rule-pack.server"
import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import { hrmCodedActionFailure } from "../schemas/hrm-action-result.shared"
import type {
  GenerateAllStatutoryPacksFormState,
  GenerateStatutoryPackFormState,
  MarkEvidenceSubmittedFormState,
} from "../types"

// ---------------------------------------------------------------------------
// Revalidation helper
// ---------------------------------------------------------------------------

/**
 * Revalidates at **layout** scope so the HRM rail's `compliance`
 * pressure badge (Phase 2 — `getHrmRailPressureCounts`) refreshes after
 * statutory-pack generation or evidence-state changes. The compliance
 * page revalidation comes along for free since it sits below the
 * layout.
 */
function revalidateCompliancePages(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/compliance"),
    "layout"
  )
}

// ---------------------------------------------------------------------------
// Phase 3U — Regeneration audit emitter (DRY across producer call sites)
// ---------------------------------------------------------------------------

/**
 * Phase 3U — Build the JSON-safe metadata blob for the
 * `erp.hrm.compliance_pack.regenerate` audit row. Lives here (not in the
 * mutation) because the action layer owns the audit grammar and decides
 * what the regulator-readable payload looks like; the mutation stays a
 * pure storage primitive returning the raw snapshot.
 *
 * Dates serialize to ISO strings so the row survives JSONB round-trips
 * cleanly and replays into downstream dashboards / log drains without
 * driver-specific Date handling. `null` fields are preserved (vs
 * dropped) so the consumer can distinguish "no value" from "field
 * removed in a later schema rev".
 */
function regenerationAuditMetadata(input: {
  packType: string
  periodId: string | null
  newInputHash: string
  newOutputHash: string
  newRulePackVersion: string
  newGeneratedAt: Date
  prior: EvidenceRegenerationSnapshot
}): Record<string, unknown> {
  const { prior } = input
  return {
    packType: input.packType,
    periodId: input.periodId,
    // Current state (post-overwrite) — included so a single audit row is
    // self-contained without joining back to the evidence table.
    newInputHash: input.newInputHash,
    newOutputHash: input.newOutputHash,
    newRulePackVersion: input.newRulePackVersion,
    newGeneratedAt: input.newGeneratedAt.toISOString(),
    // Prior provenance (lost on UPDATE).
    priorInputHash: prior.priorInputHash,
    priorOutputHash: prior.priorOutputHash,
    priorRulePackVersion: prior.priorRulePackVersion,
    priorGeneratedAt: prior.priorGeneratedAt.toISOString(),
    priorGeneratedByUserId: prior.priorGeneratedByUserId,
    // Prior lifecycle state (lost on UPDATE — this is the operational
    // headline: "the regenerated pack does not inherit the
    // KWSP-acknowledged status from the version Bob downloaded").
    priorSubmissionState: prior.priorSubmissionState,
    priorSubmissionDeliveryId: prior.priorSubmissionDeliveryId,
    priorExternalReference: prior.priorExternalReference,
    priorAcknowledgedAt: prior.priorAcknowledgedAt?.toISOString() ?? null,
    priorAcknowledgedByUserId: prior.priorAcknowledgedByUserId,
    priorAcknowledgementSource: prior.priorAcknowledgementSource,
    priorAuthorityPayloadHash: prior.priorAuthorityPayloadHash,
  }
}

// ---------------------------------------------------------------------------
// Generate statutory pack for one period + packType
// ---------------------------------------------------------------------------

export async function generateStatutoryPackAction(
  _prev: GenerateStatutoryPackFormState,
  formData: FormData
): Promise<GenerateStatutoryPackFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) {
    return hrmCodedActionFailure("permission_denied", gate.error)
  }
  const { organizationId, userId, sessionId } = gate.session

  const periodId = formData.get("periodId")?.toString()
  const packType = formData.get("packType")?.toString() as
    | StatutoryPackType
    | undefined

  if (!periodId) {
    return hrmCodedActionFailure("validation", "periodId is required.")
  }
  if (!packType) {
    return hrmCodedActionFailure("validation", "packType is required.")
  }

  const period = await getPayrollPeriod(organizationId, periodId)
  if (!period) {
    return hrmCodedActionFailure("not_found", "Payroll period not found.")
  }
  if (period.state !== "locked") {
    return hrmCodedActionFailure(
      "period_not_locked",
      "Lock the payroll period before generating statutory evidence — only locked rule-pack snapshots are audit-trustworthy."
    )
  }

  const periodEndDate = new Date(period.periodEnd)
  const countryCode = await getPayrollPeriodPrimaryCountryCode(
    organizationId,
    periodId
  )

  let rulePack
  try {
    rulePack = resolveRulePack(countryCode, periodEndDate)
  } catch {
    return hrmCodedActionFailure(
      "rule_pack_missing",
      `No rule pack for ${countryCode} at ${period.periodEnd}.`
    )
  }

  const runs = await fetchRunsForStatutoryPack(organizationId, periodId)
  if (runs.length === 0) {
    return hrmCodedActionFailure(
      "no_runs",
      "No payroll runs found for this period. Prepare payroll runs first."
    )
  }

  // Phase 3S — single-source the generation instant so the hashed body and
  // the row's `generatedAt` column anchor the *same* time. Re-derivation
  // (export, retry, re-submit) replays this exact instant via
  // `buildStatutoryPackFromRuns({ now: evidence.generatedAt })`, producing
  // byte-identical bytes — which is the whole basis of the drift check.
  const generatedAt = new Date()
  const { payload, inputHash, outputHash } = buildStatutoryPackFromRuns(
    rulePack,
    packType,
    runs,
    { now: generatedAt }
  )

  const {
    id: evidenceId,
    isNew,
    prior,
  } = await upsertComplianceEvidenceMutation({
    organizationId,
    periodId,
    countryCode,
    packType,
    inputHash,
    outputHash,
    rulePackVersion: rulePack.version,
    generatedByUserId: userId,
    generatedAt,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "compliance_pack",
        verb: "create",
      }),
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm.compliance_evidence",
      resourceId: evidenceId,
      metadata: {
        packType,
        periodId,
        rulePackVersion: rulePack.version,
        inputHash,
        outputHash,
        isNew,
      },
    })
  )

  // Phase 3U — only emit the regenerate audit when the upsert actually
  // OVERWROTE a different inputHash. Idempotent identical-hash
  // re-submits return `prior: null` and produce no row, exactly the
  // discipline the audit policy asks for ("no DB write -> no audit").
  if (prior !== null) {
    const regeneratePriorSnapshot = prior
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: STATUTORY_PACK_REGENERATE_AUDIT_ACTION,
        organizationId,
        actorUserId: userId,
        actorSessionId: sessionId,
        resourceType: "hrm.compliance_evidence",
        resourceId: evidenceId,
        metadata: regenerationAuditMetadata({
          packType,
          periodId,
          newInputHash: inputHash,
          newOutputHash: outputHash,
          newRulePackVersion: rulePack.version,
          newGeneratedAt: generatedAt,
          prior: regeneratePriorSnapshot,
        }),
      })
    )
  }

  revalidateCompliancePages()

  return { ok: true, bulk: false, evidenceId, packType, inputHash, payload }
}

// ---------------------------------------------------------------------------
// Generate all standard packs for a period (convenience bulk action)
// ---------------------------------------------------------------------------

export async function generateAllStatutoryPacksAction(
  _prev: GenerateAllStatutoryPacksFormState,
  formData: FormData
): Promise<GenerateAllStatutoryPacksFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) {
    return hrmCodedActionFailure("permission_denied", gate.error)
  }
  const { organizationId, userId, sessionId } = gate.session

  const periodId = formData.get("periodId")?.toString()
  if (!periodId) {
    return hrmCodedActionFailure("validation", "periodId is required.")
  }

  const period = await getPayrollPeriod(organizationId, periodId)
  if (!period) {
    return hrmCodedActionFailure("not_found", "Payroll period not found.")
  }
  if (period.state !== "locked") {
    return hrmCodedActionFailure(
      "period_not_locked",
      "Lock the payroll period before generating statutory evidence — only locked rule-pack snapshots are audit-trustworthy."
    )
  }

  const periodEndDate = new Date(period.periodEnd)
  const countryCode = await getPayrollPeriodPrimaryCountryCode(
    organizationId,
    periodId
  )

  let rulePack
  try {
    rulePack = resolveRulePack(countryCode, periodEndDate)
  } catch {
    return hrmCodedActionFailure(
      "rule_pack_missing",
      `No rule pack for ${countryCode} at ${period.periodEnd}.`
    )
  }

  const packTypes = rulePack.defaultStatutoryPackTypes()
  const runs = await fetchRunsForStatutoryPack(organizationId, periodId)

  if (runs.length === 0) {
    return hrmCodedActionFailure(
      "no_runs",
      "No payroll runs found for this period."
    )
  }

  // Phase 3S — share one `generatedAt` across the whole bulk run so every
  // pack in this period is anchored to the same instant. Each pack still
  // gets its own `outputHash` because the hashed body differs by packType,
  // but they all replay deterministically against the same stored
  // timestamp.
  const generatedAt = new Date()
  const evidenceIds: string[] = []
  // Phase 3U — buffer per-pack regeneration audits and emit them inside a
  // single `after()` so the bulk loop stays one round-trip per pack and
  // request-handling latency is unchanged. Producing the entries inline
  // (instead of `after()` per pack) means the closure captures clean
  // values, not loop-variable references.
  const regenerationAudits: Array<{
    evidenceId: string
    packType: StatutoryPackType
    metadata: Record<string, unknown>
  }> = []
  for (const packType of packTypes) {
    const { inputHash, outputHash } = buildStatutoryPackFromRuns(
      rulePack,
      packType,
      runs,
      { now: generatedAt }
    )
    const { id, prior } = await upsertComplianceEvidenceMutation({
      organizationId,
      periodId,
      countryCode,
      packType,
      inputHash,
      outputHash,
      rulePackVersion: rulePack.version,
      generatedByUserId: userId,
      generatedAt,
    })
    evidenceIds.push(id)
    if (prior !== null) {
      regenerationAudits.push({
        evidenceId: id,
        packType,
        metadata: regenerationAuditMetadata({
          packType,
          periodId,
          newInputHash: inputHash,
          newOutputHash: outputHash,
          newRulePackVersion: rulePack.version,
          newGeneratedAt: generatedAt,
          prior,
        }),
      })
    }
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "compliance_pack",
        verb: "create",
      }),
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm.compliance_period",
      resourceId: periodId,
      metadata: {
        periodId,
        rulePackVersion: rulePack.version,
        packsGenerated: evidenceIds.length,
        evidenceIds,
      },
    })
  )
  // Phase 3U — emit one regenerate audit row per pack that was actually
  // overwritten in this bulk run. Same `after()` discipline as the
  // single-pack producer so request-handling latency is unaffected.
  if (regenerationAudits.length > 0) {
    const audits = regenerationAudits
    after(async () => {
      for (const entry of audits) {
        await writeIamAuditEventFromNextHeaders({
          action: STATUTORY_PACK_REGENERATE_AUDIT_ACTION,
          organizationId,
          actorUserId: userId,
          actorSessionId: sessionId,
          resourceType: "hrm.compliance_evidence",
          resourceId: entry.evidenceId,
          metadata: entry.metadata,
        })
      }
    })
  }
  revalidateCompliancePages()

  return {
    ok: true,
    bulk: true,
    count: evidenceIds.length,
    evidenceIds,
    rulePackVersion: rulePack.version,
  }
}

// ---------------------------------------------------------------------------
// Mark evidence as submitted (HR manually confirms bureau submission)
// ---------------------------------------------------------------------------

export async function markEvidenceSubmittedAction(
  _prev: MarkEvidenceSubmittedFormState,
  formData: FormData
): Promise<MarkEvidenceSubmittedFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) {
    return hrmCodedActionFailure("permission_denied", gate.error)
  }
  const { organizationId, userId, sessionId } = gate.session

  const evidenceId = formData.get("evidenceId")?.toString()
  const externalReference = formData.get("externalReference")?.toString()

  if (!evidenceId) {
    return hrmCodedActionFailure("validation", "evidenceId is required.")
  }

  await updateComplianceSubmissionStateMutation(
    organizationId,
    evidenceId,
    "submitted",
    { externalReference, updatedByUserId: userId }
  )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildCrudSapAuditAction({
        area: "erp",
        module: "hrm",
        object: "compliance_pack",
        verb: "update",
      }),
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm.compliance_evidence",
      resourceId: evidenceId,
      metadata: { submissionState: "submitted", externalReference },
    })
  )
  revalidateCompliancePages()

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Read compliance evidence for a period (used by RSC)
// ---------------------------------------------------------------------------

export { listComplianceEvidenceForPeriod }
