"use server"

import { headers as nextHeaders } from "next/headers"
import { revalidatePath } from "next/cache"

import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { acknowledgeEvidenceTransition } from "../data/compliance-acknowledgement.server"
import { requireComplianceSessionMutationGate } from "../data/compliance-action-guard.server"
import { hrmCodedActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { AcknowledgeStatutoryEvidenceFormState } from "../../../types"

const EXTERNAL_REFERENCE_MAX_LENGTH = 128

/**
 * Revalidates at **layout** scope so the HRM rail's `compliance`
 * pressure badge (Phase 2 — `getHrmRailPressureCounts`) refreshes
 * after a manual acknowledgement closes the `submitted -> acknowledged`
 * lifecycle loop. Acknowledgement removes the row from the
 * "awaiting bureau" set and is exactly the transition the badge
 * surfaces. The compliance page revalidation comes along for free
 * since it sits below the layout.
 */
function revalidateCompliancePages(): void {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/compliance"),
    "layout"
  )
}

/**
 * Manual bureau acknowledgement — closes the compliance lifecycle when the
 * operator records a confirmed bureau receipt. Captures an optional external
 * reference (bureau receipt number / case id).
 *
 * Phase 3J — this action is now a THIN wrapper around the shared transition
 * function {@link acknowledgeEvidenceTransition} so that the webhook
 * receiver and this manual flow cannot drift on:
 *   - state guard (`submitted` -> `acknowledged` only)
 *   - audit action name + metadata shape
 *   - acknowledgement provenance population (Phase 3I columns)
 *   - idempotency (`already_acknowledged` returns the existing row)
 *
 * Action-layer responsibilities that remain HERE (not in the shared
 * transition):
 *   - HR admin role gate
 *   - form-data validation + reference normalization
 *   - HTTP context capture from `next/headers` for the audit row
 *   - cache revalidation
 *   - mapping the typed transition result onto `useActionState` shape
 */
export async function acknowledgeStatutoryEvidenceAction(
  _prev: AcknowledgeStatutoryEvidenceFormState,
  formData: FormData
): Promise<AcknowledgeStatutoryEvidenceFormState> {
  const gate = await requireComplianceSessionMutationGate("update")
  if (!gate.ok) {
    return hrmCodedActionFailure("permission_denied", gate.error)
  }
  const { organizationId, userId, sessionId } = gate

  const evidenceId = formData.get("evidenceId")?.toString()
  if (!evidenceId) {
    return hrmCodedActionFailure("validation", "evidenceId is required.")
  }

  // Reference normalization at the boundary; trim once, treat empty-after-trim
  // as "no reference" so the column ends up `null` rather than "".
  const rawReference = formData.get("externalReference")?.toString() ?? ""
  const trimmedReference = rawReference.trim()
  if (trimmedReference.length > EXTERNAL_REFERENCE_MAX_LENGTH) {
    return hrmCodedActionFailure(
      "validation",
      `External reference exceeds ${EXTERNAL_REFERENCE_MAX_LENGTH} characters.`
    )
  }
  const externalReference =
    trimmedReference.length > 0 ? trimmedReference : null

  const h = await nextHeaders()

  const result = await acknowledgeEvidenceTransition({
    organizationId,
    evidenceId,
    source: "manual",
    acknowledgedByUserId: userId,
    actorSessionId: sessionId,
    externalReference,
    // Manual flow does not have a bureau-supplied payload to hash. Future
    // editor flows (e.g. operator pasting the bureau response) could pass
    // it here as a tri-state opt.
    authorityPayloadHash: null,
    httpContext: {
      path: h.get("x-pathname") ?? null,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent") ?? null,
    },
  })

  if (result.status === "not_found") {
    return hrmCodedActionFailure("not_found", "Evidence not found.")
  }
  if (result.status === "already_acknowledged") {
    return hrmCodedActionFailure(
      "invalid_state",
      'Evidence is already in state "acknowledged".'
    )
  }
  if (result.status === "invalid_state") {
    return hrmCodedActionFailure(
      "invalid_state",
      `Evidence is in state "${result.currentState}"; acknowledgement is only allowed from "submitted".`
    )
  }
  if (result.status === "no_audit_action") {
    return hrmCodedActionFailure(
      "validation",
      `No acknowledgement audit action registered for pack "${result.packType}".`
    )
  }

  revalidateCompliancePages()

  return {
    ok: true,
    evidenceId: result.evidenceId,
    auditAction: result.auditAction,
    externalReference: result.externalReference,
  }
}
