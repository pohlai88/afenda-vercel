"use server"

import { and, eq } from "drizzle-orm"

import { refresh } from "next/cache"

import { appendOneThingOneThingAudit7w1h } from "#features/onething/server"
import {
  canTransitionOneThingState,
  evaluateResolveDoD,
  mapLegacyOneThingStateToOneThingState,
  markPredictionsClearedForResolve,
  resolveOrgOneThingFormSchema,
  resolveSeverityForOneThingRow,
  safeParseResolutionProof,
  type OneThingState,
  type ResolveDoDChecks,
} from "#features/onething"
import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"
import { auditEvent7W1HSchema } from "#lib/erp/audit-7w1h.shared"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgIThinkDashboard } from "../data/ithink-revalidate.server"
import { getIThinkById } from "../data/ithink.queries.server"

export type ResolveIThinkResult =
  | { ok: true }
  | {
      ok: false
      code: "invalid_input" | "not_found" | "bad_transition" | "dod_failed"
      checks?: ResolveDoDChecks
    }

/**
 * Same operational semantics as `resolveOrgOneThing` (DoD, transitions, proof,
 * predictions) but persists 7W1H under `erp.ithink.consequence.resolve` and
 * revalidates `/dashboard/ithink` (ADR-0002 routing).
 */
export async function resolveIThink(
  formData: FormData
): Promise<ResolveIThinkResult> {
  const parsed = resolveOrgOneThingFormSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    resolutionNote: formData.get("resolutionNote") ?? "",
    resolutionProofJson: formData.get("resolutionProofJson") ?? "",
  })
  if (!parsed.success) {
    return { ok: false, code: "invalid_input" }
  }

  const { organizationId, userId, sessionId } = await requireOrgSession()
  const { oneThingId, resolutionNote, resolutionProofJson } = parsed.data

  const row = await getIThinkById(oneThingId, organizationId)
  if (!row) return { ok: false, code: "not_found" }

  if (row.state === "resolved") {
    return { ok: true }
  }

  let proofCount = 0
  let resolutionProof: Array<{
    type: string
    ref: string
    verifiedAt?: string
  }> | null = null
  if (resolutionProofJson.trim().length > 0) {
    try {
      const raw = JSON.parse(resolutionProofJson) as unknown
      const pr = safeParseResolutionProof(raw)
      if (pr) {
        resolutionProof = pr
        proofCount = pr.length
      }
    } catch {
      return { ok: false, code: "invalid_input" }
    }
  }

  const fromState =
    mapLegacyOneThingStateToOneThingState(row.state, row.assigneeUserId) ??
    (row.state as OneThingState)

  if (!canTransitionOneThingState(fromState, "resolved")) {
    return { ok: false, code: "bad_transition" }
  }

  const severity = resolveSeverityForOneThingRow(row)
  const dod = evaluateResolveDoD(severity, {
    resolutionNote,
    resolutionProofCount: proofCount,
    predictions: row.predictions ?? [],
    willClearPredictionsOnResolve: true,
  })
  if (!dod.ok) {
    return { ok: false, code: "dod_failed", checks: dod.checks }
  }

  const clearedPredictions = markPredictionsClearedForResolve(row.predictions)

  await db
    .update(oneThing)
    .set({
      state: "resolved",
      resolvedAt: new Date(),
      resolutionNote: resolutionNote.trim() || null,
      resolutionProof,
      predictions: clearedPredictions,
      snoozeUntil: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(oneThing.id, oneThingId),
        eq(oneThing.organizationId, organizationId)
      )
    )

  const whenIso = new Date().toISOString()
  const event = auditEvent7W1HSchema.parse({
    who: "Organization member",
    what: "Resolved the iThink consequence",
    when: whenIso,
    where: "iThink",
    why:
      resolutionNote.trim() ||
      "Resolved the consequence with operational safety restored.",
    which: `onething:${oneThingId}`,
    whom: "organization",
    how: "server-action",
    action: buildCrudSapAuditAction({
      area: "erp",
      module: "ithink",
      object: "consequence",
      verb: "resolve",
    }),
  })

  await appendOneThingOneThingAudit7w1h(
    oneThingId,
    { organizationId },
    {
      event,
      iam: {
        actorUserId: userId,
        actorSessionId: sessionId,
        organizationId,
        resourceType: "onething",
        resourceId: oneThingId,
        metadata: {},
      },
    }
  )

  revalidateOrgIThinkDashboard()
  refresh()
  return { ok: true }
}
