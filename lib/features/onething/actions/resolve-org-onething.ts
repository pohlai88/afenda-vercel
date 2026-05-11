"use server"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing } from "#lib/db/schema"
import { auditEvent7W1HSchema } from "#lib/erp/audit-7w1h.shared"
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { requireOrgSession } from "#lib/tenant"

import { appendOneThingOneThingAudit7w1h } from "../data/onething-audit.server"
import {
  canTransitionOneThingState,
  evaluateResolveDoD,
  mapLegacyOneThingStateToOneThingState,
  resolveSeverityForOneThingRow,
  type ResolveDoDChecks,
} from "../data/onething-onething-state.server"
import { markPredictionsClearedForResolve } from "../data/onething-prediction.server"
import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { getOneThingScoped } from "../data/onething.queries.server"
import type { OneThingState } from "../constants"
import {
  resolveOrgOneThingFormSchema,
  safeParseResolutionProof,
} from "../schemas/onething-onething.schema"

export type ResolveOrgOneThingResult =
  | { ok: true }
  | {
      ok: false
      code: "invalid_input" | "not_found" | "bad_transition" | "dod_failed"
      checks?: ResolveDoDChecks
    }

export async function resolveOrgOneThing(
  formData: FormData
): Promise<ResolveOrgOneThingResult> {
  const parsed = resolveOrgOneThingFormSchema.safeParse({
    oneThingId: formData.get("oneThingId"),
    resolutionNote: formData.get("resolutionNote") ?? "",
    resolutionProofJson: formData.get("resolutionProofJson") ?? "",
  })
  if (!parsed.success) {
    return { ok: false, code: "invalid_input" }
  }

  const { organizationId, userId, sessionId, user } = await requireOrgSession()
  const { oneThingId, resolutionNote, resolutionProofJson } = parsed.data

  const row = await getOneThingScoped(oneThingId, organizationId, null)
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
  const whoRaw =
    user.name?.trim() || user.email?.trim() || "Organization member"
  const who = whoRaw.length > 512 ? whoRaw.slice(0, 512) : whoRaw
  const event = auditEvent7W1HSchema.parse({
    who,
    what: "Resolved the operational consequence",
    when: whenIso,
    where: "OneThing",
    why:
      resolutionNote.trim() ||
      "Resolved the OneThing with operational safety restored.",
    which: `onething:${oneThingId}`,
    whom: "organization",
    how: "server-action",
    action: buildCrudSapAuditAction({
      area: "erp",
      module: "onething",
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

  revalidateOrgOneThingDashboard()

  return { ok: true }
}
