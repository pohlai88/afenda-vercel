import "server-only"

import { writeIamAuditEvent } from "#lib/auth"

import { getComplianceEvidence } from "./compliance.queries.server"
import { updateComplianceSubmissionStateMutation } from "./compliance.mutations.server"
import {
  ackEventTypeForStatutoryPack,
  authorityForStatutoryPack,
  type AcknowledgementSource,
} from "./statutory-event-types.shared"

/**
 * Phase 3J — shared `submitted -> acknowledged` transition.
 *
 * Both the manual HR action (`acknowledgeStatutoryEvidenceAction`) and the
 * bureau-side webhook receiver
 * (`app/api/integrations/hrm-statutory-acknowledgement/[deliveryId]`) MUST
 * route through this function. Two reasons:
 *
 *   1. State guard, audit emission, provenance population, and idempotency
 *      handling cannot drift between mutation surfaces. A bug fixed in one
 *      path must propagate to the other automatically.
 *   2. The audit row + evidence row must move together; if the audit emit
 *      fails the row update should still hold (and vice versa fail-safe
 *      semantics are documented per branch below).
 *
 * Outcomes are returned as values, not thrown exceptions, so the calling
 * surface (Server Action or Route Handler) can map them to the appropriate
 * response shape (form-state object vs HTTP status).
 */

export type AcknowledgeEvidenceTransitionInput = {
  organizationId: string
  evidenceId: string
  source: AcknowledgementSource
  /** Actor for `manual` (HR user). `null` for `webhook` / `api` / `import`. */
  acknowledgedByUserId: string | null
  /** Bureau receipt number / case id, when supplied. */
  externalReference?: string | null
  /** SHA-256 of bureau-supplied payload. NULL for manual / API-poll today. */
  authorityPayloadHash?: string | null
  /** Optional session id to attach to the audit row (manual flow only). */
  actorSessionId?: string | null
  /**
   * Optional HTTP request context for the audit row. Caller is responsible
   * for capturing these from its own header source (Server Actions use
   * `next/headers()`; Route Handlers use `request.headers`). The shared
   * function intentionally stays pure of `next/headers` imports.
   */
  httpContext?: {
    path?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  }
}

export type AcknowledgeEvidenceTransitionResult =
  | {
      status: "acknowledged"
      evidenceId: string
      auditAction: string
      acknowledgedAt: Date
      externalReference: string | null
      authorityPayloadHash: string | null
    }
  | {
      // Idempotency: row was already acknowledged. We do NOT write a second
      // audit row (that would falsely imply a second authority confirmation).
      // Webhook receivers MUST treat this as 200-OK so the bureau stops
      // retrying; manual actions surface it as `invalid_state`.
      status: "already_acknowledged"
      evidenceId: string
      acknowledgedAt: Date | null
      acknowledgementSource: string | null
      externalReference: string | null
      authorityPayloadHash: string | null
    }
  | {
      status: "not_found"
    }
  | {
      // State machine guard: row exists but is not in `submitted`. Includes
      // `draft` (HR has not sent it yet), `failed` (last delivery failed —
      // submit again first), `queued` (in-flight). Never `acknowledged`
      // (that case is `already_acknowledged` above with full row context).
      status: "invalid_state"
      currentState: string
    }
  | {
      // Pack type has no registered audit action — should be impossible if
      // the schema admits only the canonical packs, but kept as an explicit
      // failure mode rather than silently writing an empty audit string.
      status: "no_audit_action"
      packType: string
    }

export async function acknowledgeEvidenceTransition(
  input: AcknowledgeEvidenceTransitionInput
): Promise<AcknowledgeEvidenceTransitionResult> {
  const evidence = await getComplianceEvidence(
    input.organizationId,
    input.evidenceId
  )
  if (!evidence) {
    return { status: "not_found" }
  }

  if (evidence.submissionState === "acknowledged") {
    return {
      status: "already_acknowledged",
      evidenceId: evidence.id,
      acknowledgedAt: evidence.acknowledgedAt,
      acknowledgementSource: evidence.acknowledgementSource,
      externalReference: evidence.externalReference,
      authorityPayloadHash: evidence.authorityPayloadHash,
    }
  }

  if (evidence.submissionState !== "submitted") {
    return {
      status: "invalid_state",
      currentState: evidence.submissionState,
    }
  }

  const auditAction = ackEventTypeForStatutoryPack(evidence.packType)
  if (!auditAction) {
    return { status: "no_audit_action", packType: evidence.packType }
  }

  // Tri-state opts (post-3I semantics):
  //   - submissionDeliveryId omitted -> preserved (acknowledgement confirms
  //     the existing transport, never replaces it)
  //   - externalReference: pass new value if supplied; omit otherwise so
  //     prior receipt id (e.g. set during a previous failed attempt cycle)
  //     survives
  //   - authorityPayloadHash: pass through tri-state — null when caller
  //     explicitly clears, value when supplied, omitted (undefined) when
  //     caller does not know
  const acknowledgedAt = new Date()
  const persistedReference =
    input.externalReference !== undefined && input.externalReference !== null
      ? input.externalReference
      : evidence.externalReference

  await updateComplianceSubmissionStateMutation(
    input.organizationId,
    input.evidenceId,
    "acknowledged",
    {
      ...(input.externalReference !== undefined &&
      input.externalReference !== null
        ? { externalReference: input.externalReference }
        : {}),
      // updatedByUserId mirrors `acknowledgedByUserId`: real id for manual,
      // null for webhook/system. Never `undefined` here so we are explicit
      // about the actor on every transition.
      updatedByUserId: input.acknowledgedByUserId,
      acknowledgedAt,
      acknowledgedByUserId: input.acknowledgedByUserId,
      acknowledgementSource: input.source,
      ...(input.authorityPayloadHash !== undefined
        ? { authorityPayloadHash: input.authorityPayloadHash }
        : {}),
    }
  )

  // Audit emission AFTER the mutation succeeds. If the mutation throws, no
  // audit row is written (the transition did not happen). If audit emission
  // throws, the mutation is already committed — `writeIamAuditEvent` swallows
  // its own failures internally and emits structured logs, so this call
  // should not throw in normal operation.
  await writeIamAuditEvent({
    action: auditAction,
    organizationId: input.organizationId,
    actorUserId: input.acknowledgedByUserId ?? undefined,
    actorSessionId: input.actorSessionId ?? undefined,
    resourceType: "hrm.compliance_evidence",
    resourceId: evidence.id,
    path: input.httpContext?.path ?? undefined,
    ipAddress: input.httpContext?.ipAddress ?? undefined,
    userAgent: input.httpContext?.userAgent ?? undefined,
    metadata: {
      packType: evidence.packType,
      periodId: evidence.periodId,
      rulePackVersion: evidence.rulePackVersion,
      deliveryId: evidence.submissionDeliveryId,
      externalReference: persistedReference,
      acknowledgedAt: acknowledgedAt.toISOString(),
      acknowledgementSource: input.source,
      authorityName: authorityForStatutoryPack(evidence.packType),
      authorityPayloadHash: input.authorityPayloadHash ?? null,
      // Retained for backward compatibility with pre-3I extractors that
      // grep `metadata.method`. Remove after one release cycle once
      // dashboards migrate to `acknowledgementSource`.
      method: input.source,
    },
  })

  return {
    status: "acknowledged",
    evidenceId: evidence.id,
    auditAction,
    acknowledgedAt,
    externalReference: persistedReference,
    authorityPayloadHash: input.authorityPayloadHash ?? null,
  }
}
