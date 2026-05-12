import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { AUDIT_ORIGIN } from "#lib/auth/audit-origin.shared"
import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"
import { neonAuthUser } from "#lib/db/schema-neon-auth"

import {
  COMPLIANCE_TIMELINE_AUDIT_ACTIONS,
  complianceTimelineKindForAuditAction,
  type ComplianceTimelineEntry,
} from "./compliance-timeline.shared"
import { getComplianceEvidence } from "./compliance.queries.server"

const DEFAULT_TIMELINE_LIMIT = 200
const MAX_TIMELINE_LIMIT = 500

/**
 * Phase 3K — Compose the per-evidence lifecycle timeline.
 *
 * Joins the THREE truth sources (intrinsic evidence row, audit chain via
 * `resourceType + resourceId`, and — when the user wants delivery-row
 * granularity — the linked `org_event_delivery` row) into a single sorted
 * `ComplianceTimelineEntry[]`.
 *
 * IDOR safety: every read scopes by `organizationId` (passed in by callers
 * who already passed `requireOrgSession`). Audit query also filters by
 * `auditOrigin = production` so simulation runs do not leak into the
 * real-world regulator surface (filter still respects the global
 * simulation-aware listing pattern in `lib/auth/org-audit.server.ts`).
 *
 * Returns `null` if no evidence row matches the (org, evidenceId) pair —
 * the route handler maps that to `notFound()`.
 */
export async function listComplianceEvidenceTimeline(input: {
  organizationId: string
  evidenceId: string
  limit?: number
}): Promise<{
  evidence: NonNullable<Awaited<ReturnType<typeof getComplianceEvidence>>>
  entries: ComplianceTimelineEntry[]
} | null> {
  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_TIMELINE_LIMIT, 1),
    MAX_TIMELINE_LIMIT
  )

  // Confirm tenancy + existence in a single read; everything else fans out
  // in parallel from this point.
  const evidence = await getComplianceEvidence(
    input.organizationId,
    input.evidenceId
  )
  if (!evidence) return null

  // Audit chain — limited to the canonical lifecycle actions (set is small,
  // SQL stays cheap) AND the production origin.
  const auditRows = await db
    .select({
      id: iamAuditEvent.id,
      createdAt: iamAuditEvent.createdAt,
      action: iamAuditEvent.action,
      actorUserId: iamAuditEvent.actorUserId,
      actorEmail: neonAuthUser.email,
      metadata: iamAuditEvent.metadata,
    })
    .from(iamAuditEvent)
    .leftJoin(neonAuthUser, eq(iamAuditEvent.actorUserId, neonAuthUser.id))
    .where(
      and(
        eq(iamAuditEvent.organizationId, input.organizationId),
        eq(iamAuditEvent.resourceType, "hrm.compliance_evidence"),
        eq(iamAuditEvent.resourceId, input.evidenceId),
        eq(iamAuditEvent.auditOrigin, AUDIT_ORIGIN.production),
        inArray(
          iamAuditEvent.action,
          COMPLIANCE_TIMELINE_AUDIT_ACTIONS as string[]
        )
      )
    )
    .orderBy(desc(iamAuditEvent.createdAt))
    .limit(limit)

  // Compose entries.
  const entries: ComplianceTimelineEntry[] = []

  // Intrinsic: generation event. We synthesize a deterministic id so React
  // keys stay stable across re-fetches; prefix avoids collision with any
  // (UUID-shaped) audit row id.
  entries.push({
    kind: "generated",
    id: `evidence:${evidence.id}:generated`,
    occurredAt: evidence.generatedAt,
    actorUserId: evidence.generatedByUserId,
    // Generation predates the audit join surface here; if HR ever needs the
    // creator email on this row we can join `neon_auth.user` again, but the
    // generated row currently shows just the actor id.
    actorEmail: null,
    metadata: {
      packType: evidence.packType,
      countryCode: evidence.countryCode,
      rulePackVersion: evidence.rulePackVersion,
      inputHash: evidence.inputHash,
      outputHash: evidence.outputHash,
    },
  })

  for (const row of auditRows) {
    const kind = complianceTimelineKindForAuditAction(row.action)
    if (!kind) continue
    entries.push({
      kind,
      id: row.id,
      occurredAt: row.createdAt,
      actorUserId: row.actorUserId,
      actorEmail: row.actorEmail,
      metadata: parseAuditMetadata(row.metadata),
    })
  }

  // Sort ascending so the operator reads the lifecycle top-to-bottom in
  // chronological order — generation at the top, latest event at the bottom.
  // UI may reverse for "most recent first" in dense lists.
  entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())

  return { evidence, entries }
}

/**
 * `iam_audit_event.metadata` is stored as JSON-text (string) per
 * `lib/auth/audit.server.ts`. Parse defensively — a malformed historical
 * row should NOT crash the timeline.
 */
function parseAuditMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null
  if (typeof raw === "object") {
    return raw as Record<string, unknown>
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}
