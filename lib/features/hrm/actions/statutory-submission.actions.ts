"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import {
  deliverEventNow,
  findEnabledEndpointForEventType,
  getOrgEventEndpointSigningKey,
} from "#features/org-admin/server"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { getComplianceEvidence } from "../data/compliance.queries.server"
import { fetchRunsForStatutoryPack } from "../data/compliance.queries.server"
import { updateComplianceSubmissionStateMutation } from "../data/compliance.mutations.server"
import { getPayrollPeriod } from "../data/payroll.queries.server"
import { resolveRulePack } from "../data/payroll-rule-pack.server"
import type { StatutoryPackType } from "../data/payroll-rule-pack.server"
import { buildStatutoryPackFromRuns } from "../data/statutory-pack.server"
import { eventTypeForStatutoryPack } from "../data/statutory-event-types.shared"
import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import type { SubmitStatutoryEvidenceFormState } from "../types"

const STATUTORY_PACK_TYPES = [
  "epf_monthly",
  "socso_monthly",
  "eis_monthly",
  "pcb_monthly",
  "ea_annual",
  "borang_e_annual",
] as const

function isStatutoryPackType(value: string): value is StatutoryPackType {
  return (STATUTORY_PACK_TYPES as readonly string[]).includes(value)
}

function revalidateCompliancePages(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/compliance"),
    "page"
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
    return { ok: false, code: "permission_denied", message: gate.error }
  }
  const { organizationId, userId, sessionId } = gate.session

  const evidenceId = formData.get("evidenceId")?.toString()
  if (!evidenceId) {
    return { ok: false, code: "validation", message: "evidenceId is required." }
  }

  const evidence = await getComplianceEvidence(organizationId, evidenceId)
  if (!evidence) {
    return { ok: false, code: "not_found", message: "Evidence not found." }
  }
  if (
    evidence.submissionState !== "draft" &&
    evidence.submissionState !== "failed"
  ) {
    return {
      ok: false,
      code: "invalid_state",
      message: `Evidence is already in state "${evidence.submissionState}"; submission is only allowed from "draft" or "failed".`,
    }
  }
  if (!evidence.periodId) {
    return {
      ok: false,
      code: "validation",
      message: "Evidence is not bound to a payroll period.",
    }
  }
  if (!isStatutoryPackType(evidence.packType)) {
    return {
      ok: false,
      code: "validation",
      message: `Unsupported pack type "${evidence.packType}".`,
    }
  }

  const eventType = eventTypeForStatutoryPack(evidence.packType)
  if (!eventType) {
    return {
      ok: false,
      code: "validation",
      message: `No outbound event type registered for pack "${evidence.packType}".`,
    }
  }

  const period = await getPayrollPeriod(organizationId, evidence.periodId)
  if (!period) {
    return {
      ok: false,
      code: "not_found",
      message: "Payroll period for this evidence has been removed.",
    }
  }
  if (period.state !== "locked") {
    return {
      ok: false,
      code: "period_not_locked",
      message:
        "Lock the payroll period before submitting statutory evidence — only locked rule-pack snapshots are audit-trustworthy.",
    }
  }

  let rulePack
  try {
    rulePack = resolveRulePack(
      evidence.countryCode,
      new Date(period.periodEnd)
    )
  } catch {
    return {
      ok: false,
      code: "rule_pack_missing",
      message: `No rule pack registered for ${evidence.countryCode} at ${period.periodEnd}.`,
    }
  }
  if (rulePack.version !== evidence.rulePackVersion) {
    return {
      ok: false,
      code: "rule_pack_drift",
      message:
        "Rule-pack version drift since evidence was generated. Regenerate evidence first.",
    }
  }

  const runs = await fetchRunsForStatutoryPack(organizationId, evidence.periodId)
  if (runs.length === 0) {
    return {
      ok: false,
      code: "no_runs",
      message: "No payroll runs available for this period.",
    }
  }

  const { payload, inputHash, outputHash } = buildStatutoryPackFromRuns(
    rulePack,
    evidence.packType,
    runs
  )

  if (
    inputHash !== evidence.inputHash ||
    outputHash !== evidence.outputHash
  ) {
    return {
      ok: false,
      code: "evidence_drift",
      message:
        "Underlying payroll data changed since evidence was generated. Regenerate evidence before submitting.",
    }
  }

  const endpoint = await findEnabledEndpointForEventType(
    organizationId,
    eventType
  )
  if (!endpoint) {
    return {
      ok: false,
      code: "endpoint_missing",
      message: `Configure an enabled endpoint subscribed to "${eventType}" in Admin → Integrations before submitting.`,
    }
  }

  const signingKey = await getOrgEventEndpointSigningKey({
    organizationId,
    endpointId: endpoint.id,
  })
  if (!signingKey) {
    return {
      ok: false,
      code: "endpoint_missing",
      message:
        "Endpoint signing key is missing — rotate the secret in Admin → Integrations.",
    }
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
    return {
      ok: false,
      code: "delivery_failed",
      message:
        result.errorMessage ?? "Delivery failed without a receiver response.",
    }
  }

  return {
    ok: true,
    evidenceId: evidence.id,
    deliveryId: delivery.id,
    eventType,
    httpStatus: result.httpStatus,
  }
}
