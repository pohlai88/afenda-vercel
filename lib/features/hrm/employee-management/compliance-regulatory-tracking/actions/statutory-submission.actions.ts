"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import {
  createPlannerSignalLink,
  insertPlannerSignal,
} from "#features/planner/server"
import {
  deliverEventNow,
  findEnabledEndpointForEventType,
  getOrgEventEndpointSigningKey,
} from "#features/org-admin/server"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/org-slug.server"

import { getComplianceEvidence } from "../data/compliance.queries.server"
import { fetchRunsForStatutoryPack } from "../data/compliance.queries.server"
import { updateComplianceSubmissionStateMutation } from "../data/compliance.mutations.server"
import { getPayrollPeriod } from "../../../payroll-compensation/payroll-processing/data/payroll.queries.server"
import { resolveRulePack } from "../../../payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server"
import type { StatutoryPackType } from "../../../payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server"
import { buildStatutoryPackFromRuns } from "../data/statutory-pack.server"
import { eventTypeForStatutoryPack } from "../data/statutory-event-types.shared"
import { requireHrmAdmin } from "../../../hrm-admin-guard.server"
import { organizationHrmPath } from "../../../constants"
import { hrmCodedActionFailure } from "../../../hrm-action-result.shared"
import type { SubmitStatutoryEvidenceFormState } from "../../../types"

const STATUTORY_PACK_TYPES = [
  "epf_monthly",
  "socso_monthly",
  "eis_monthly",
  "pcb_monthly",
  "hrdf_monthly",
  "ea_annual",
  "borang_e_annual",
] as const

function isStatutoryPackType(value: string): value is StatutoryPackType {
  return (STATUTORY_PACK_TYPES as readonly string[]).includes(value)
}

/**
 * Revalidates at **layout** scope so the HRM rail's `compliance`
 * pressure badge (Phase 2 — `getHrmRailPressureCounts`) refreshes
 * after every submission state transition. Outbound submission
 * transitions are the most pressure-sensitive moments in the
 * compliance lifecycle. The compliance page revalidation comes along
 * for free since it sits below the layout.
 */
function revalidateCompliancePages(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/compliance"),
    "layout"
  )
}

/**
 * Submits a generated statutory evidence pack to the bureau via the existing
 * `org_event_delivery` outbox (HMAC `v1` envelope). Reuses the canonical
 * delivery pipeline shipped with `org-admin` — no parallel signing or
 * transport code in HRM.
 *
 * Lifecycle on the `hrm_compliance_evidence` row:
 *
 *   draft | failed
 *     -> deliveryNow (synchronous POST)
 *         -> 2xx: submitted + submissionDeliveryId set
 *                + audit `erp.hrm.statutory.<bureau>.submitted`
 *         -> non-2xx / network: failed + submissionDeliveryId set
 *                + audit `erp.execution.statutory_submission.delivery.failed`
 *
 * Idempotency is provided by the delivery row's `payloadHash` (sha-256 of the
 * canonical JSON envelope). Receivers that have seen the same hash should
 * acknowledge without duplicating downstream side effects.
 *
 * Pre-conditions enforced server-side:
 *   - HRM admin role.
 *   - Evidence row belongs to the active org.
 *   - Period is locked (only locked rule-pack snapshots are audit-trustworthy).
 *   - Re-derived `inputHash` + `outputHash` match the stored row (drift guard).
 *   - Org has an enabled endpoint subscribed to the mapped event type.
 *   - Evidence is in `draft` or `failed` (retry); never re-submits `submitted`.
 */
export async function submitStatutoryEvidenceForDeliveryAction(
  _prev: SubmitStatutoryEvidenceFormState,
  formData: FormData
): Promise<SubmitStatutoryEvidenceFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) {
    return hrmCodedActionFailure("permission_denied", gate.error)
  }
  const { organizationId, userId, sessionId } = gate.session

  const evidenceId = formData.get("evidenceId")?.toString()
  if (!evidenceId) {
    return hrmCodedActionFailure("validation", "evidenceId is required.")
  }

  const evidence = await getComplianceEvidence(organizationId, evidenceId)
  if (!evidence) {
    return hrmCodedActionFailure("not_found", "Evidence not found.")
  }
  if (
    evidence.submissionState !== "draft" &&
    evidence.submissionState !== "failed"
  ) {
    return hrmCodedActionFailure(
      "invalid_state",
      `Evidence is already in state "${evidence.submissionState}"; submission is only allowed from "draft" or "failed".`
    )
  }
  if (!evidence.periodId) {
    return hrmCodedActionFailure(
      "validation",
      "Evidence is not bound to a payroll period."
    )
  }
  if (!isStatutoryPackType(evidence.packType)) {
    return hrmCodedActionFailure(
      "validation",
      `Unsupported pack type "${evidence.packType}".`
    )
  }

  const eventType = eventTypeForStatutoryPack(evidence.packType)
  if (!eventType) {
    return hrmCodedActionFailure(
      "validation",
      `No outbound event type registered for pack "${evidence.packType}".`
    )
  }

  const period = await getPayrollPeriod(organizationId, evidence.periodId)
  if (!period) {
    return hrmCodedActionFailure(
      "not_found",
      "Payroll period for this evidence has been removed."
    )
  }
  if (period.state !== "locked") {
    return hrmCodedActionFailure(
      "period_not_locked",
      "Lock the payroll period before submitting statutory evidence — only locked rule-pack snapshots are audit-trustworthy."
    )
  }

  let rulePack
  try {
    rulePack = resolveRulePack(evidence.countryCode, new Date(period.periodEnd))
  } catch {
    return hrmCodedActionFailure(
      "rule_pack_missing",
      `No rule pack registered for ${evidence.countryCode} at ${period.periodEnd}.`
    )
  }
  if (rulePack.version !== evidence.rulePackVersion) {
    return hrmCodedActionFailure(
      "rule_pack_drift",
      "Rule-pack version drift since evidence was generated. Regenerate evidence first."
    )
  }

  const runs = await fetchRunsForStatutoryPack(
    organizationId,
    evidence.periodId
  )
  if (runs.length === 0) {
    return hrmCodedActionFailure(
      "no_runs",
      "No payroll runs available for this period."
    )
  }

  // Phase 3S — replay the stored generation instant so EA / Borang E
  // re-derive byte-identically (both embed `generatedAt` in the hashed
  // body). Otherwise the drift check below would always fail for those
  // annual packs.
  const { payload, inputHash, outputHash } = buildStatutoryPackFromRuns(
    rulePack,
    evidence.packType,
    runs,
    { now: evidence.generatedAt }
  )

  if (inputHash !== evidence.inputHash || outputHash !== evidence.outputHash) {
    return hrmCodedActionFailure(
      "evidence_drift",
      "Underlying payroll data changed since evidence was generated. Regenerate evidence before submitting."
    )
  }

  const endpoint = await findEnabledEndpointForEventType(
    organizationId,
    eventType
  )
  if (!endpoint) {
    return hrmCodedActionFailure(
      "endpoint_missing",
      `Configure an enabled endpoint subscribed to "${eventType}" in Admin → Integrations before submitting.`
    )
  }

  const signingKey = await getOrgEventEndpointSigningKey({
    organizationId,
    endpointId: endpoint.id,
  })
  if (!signingKey) {
    return hrmCodedActionFailure(
      "endpoint_missing",
      "Endpoint signing key is missing — rotate the secret in Admin → Integrations."
    )
  }

  const envelope = {
    id: crypto.randomUUID(),
    type: eventType,
    occurredAt: new Date().toISOString(),
    organizationId,
    data: {
      evidenceId: evidence.id,
      countryCode: evidence.countryCode,
      packType: evidence.packType,
      rulePackVersion: evidence.rulePackVersion,
      period: {
        id: period.id,
        start: period.periodStart,
        end: period.periodEnd,
        paymentDate: period.paymentDate,
      },
      provenance: {
        inputHash,
        outputHash,
        generatedAt: evidence.generatedAt.toISOString(),
      },
      payload,
    },
  }

  const { delivery, result } = await deliverEventNow({
    endpoint,
    signingKey,
    envelope,
  })

  const succeeded = result.state === "delivered"

  await updateComplianceSubmissionStateMutation(
    organizationId,
    evidence.id,
    succeeded ? "submitted" : "failed",
    {
      submissionDeliveryId: delivery.id,
      updatedByUserId: userId,
    }
  )

  if (succeeded) {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: eventType, // erp.hrm.statutory.<bureau>.submitted
        organizationId,
        actorUserId: userId,
        actorSessionId: sessionId,
        resourceType: "hrm.compliance_evidence",
        resourceId: evidence.id,
        metadata: {
          packType: evidence.packType,
          periodId: evidence.periodId,
          rulePackVersion: evidence.rulePackVersion,
          deliveryId: delivery.id,
          endpointId: endpoint.id,
          httpStatus: result.httpStatus,
          payloadHash: delivery.payloadHash,
          durationMs: result.durationMs,
        },
      })
    )
  } else {
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_DELIVERY_FAILED,
        organizationId,
        actorUserId: userId,
        actorSessionId: sessionId,
        resourceType: "hrm.compliance_evidence",
        resourceId: evidence.id,
        metadata: {
          packType: evidence.packType,
          periodId: evidence.periodId,
          rulePackVersion: evidence.rulePackVersion,
          deliveryId: delivery.id,
          endpointId: endpoint.id,
          eventType,
          httpStatus: result.httpStatus,
          errorMessage: result.errorMessage,
          durationMs: result.durationMs,
        },
      })
    )
  }

  revalidateCompliancePages()

  if (!succeeded) {
    const orgSlug = await getOrganizationSlugById(organizationId)
    const signal = await insertPlannerSignal({
      scope: { scopeKind: "organization", organizationId },
      title: `Statutory delivery failed for ${evidence.packType}`,
      description:
        result.errorMessage ??
        "Statutory submission delivery failed and requires operational follow-up.",
      signalClass: "anomaly",
      actorUserId: userId,
      originatingSystem: "hrm.compliance",
      pressure: {
        urgency: 4,
        impact: 4,
        severity: 4,
        confidence: 4,
        effort: 2,
        escalationLevel: 3,
        temporalProximity: 4,
        ownershipPressure: 3,
      },
    })

    await createPlannerSignalLink({
      scope: { scopeKind: "organization", organizationId },
      signalId: signal.id,
      module: "hrm",
      entityType: "compliance_evidence",
      entityId: evidence.id,
      displayLabel: `${evidence.packType} evidence`,
      href: orgSlug ? organizationHrmPath(orgSlug, "compliance") : null,
      causalityReason: "Statutory evidence delivery failed.",
      actorUserId: userId,
    })

    return hrmCodedActionFailure(
      "delivery_failed",
      result.errorMessage ?? "Delivery failed without a receiver response."
    )
  }

  return {
    ok: true,
    evidenceId: evidence.id,
    deliveryId: delivery.id,
    eventType,
    httpStatus: result.httpStatus,
  }
}
