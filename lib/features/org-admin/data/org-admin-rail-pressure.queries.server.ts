import "server-only"

import { cache } from "react"
import { and, count, eq, gt, gte, inArray, isNotNull, min } from "drizzle-orm"

import { db } from "#lib/db"
import {
  importJob,
  importJobRow,
  orgEventDelivery,
  orgEventEndpoint,
} from "#lib/db/schema"
import { neonAuthInvitation } from "#lib/db/schema-neon-auth"
import { logUnexpectedServerError } from "#lib/logger.server"

import type { OrgAdminRailPressureMap } from "../types"

import {
  ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS,
  deriveOrgAdminIntegrationsPressure,
  deriveOrgAdminMembersPressure,
  type IntegrationsPressureInput,
  type InvitationPressureInput,
} from "./org-admin-rail-pressure.shared"

/**
 * Read-side of Phase 2 rail pressure for the organizational control plane.
 *
 * Composes three index-friendly aggregates inside a single `Promise.all`:
 *
 *   1. Pending, non-expired invitations on `neon_auth.invitation`.
 *   2. Currently in-flight import jobs (`uploaded` or `running`).
 *   3. Recently failed work — failed import-job rows and failed outbound
 *      `org_event_delivery` rows inside the surfacing window.
 *
 * The query layer is **the only place** that reads the wall clock; it
 * snapshots `now` once and passes derived durations to the pure threshold
 * helpers in `org-admin-rail-pressure.shared.ts`. That keeps the
 * threshold tests deterministic and lets the snapshot survive layout
 * client-cache replays in lock-step with the layout RSC payload.
 *
 * Wrapped in `React.cache` so multiple consumers in the same request (the
 * layout, Suspense-streamed enrichment, page-level reuse) hit a single
 * round trip. Layout-scoped Server Actions revalidate with
 * `revalidatePath(..., "layout")` so the rail badge refreshes after
 * member / integration / import mutations.
 */
export const getOrgAdminRailPressureCounts = cache(
  async (organizationId: string): Promise<OrgAdminRailPressureMap> => {
    const now = new Date()
    const surfaceWindowStart = new Date(
      now.getTime() -
        ORG_ADMIN_RAIL_PRESSURE_THRESHOLDS.integrationFailureCriticalAgeHours *
          60 *
          60 *
          1000 *
          // Surfaces failures for twice the critical SLA so an operator
          // sees attention-tier rows for a generous catch-up window
          // before they drop below the rail's radar.
          2
    )

    const [invitationStats, integrationStats] = await Promise.all([
      queryInvitationStats(organizationId, now),
      queryIntegrationsStats(organizationId, surfaceWindowStart, now),
    ])

    const map: OrgAdminRailPressureMap = {}

    const members = deriveOrgAdminMembersPressure(invitationStats)
    if (members !== null) {
      map.members = members
    }

    const integrations = deriveOrgAdminIntegrationsPressure(integrationStats)
    if (integrations !== null) {
      map.integrations = integrations
    }

    return map
  }
)

/**
 * Single round-trip for the `members` nav badge. Counts non-expired
 * `pending` invitations and records the oldest creation timestamp so the
 * threshold helper can choose `attention` vs `critical` based on age.
 */
async function queryInvitationStats(
  organizationId: string,
  now: Date
): Promise<InvitationPressureInput> {
  try {
    const [row] = await db
      .select({
        pendingCount: count(neonAuthInvitation.id),
        oldestCreatedAt: min(neonAuthInvitation.createdAt),
      })
      .from(neonAuthInvitation)
      .where(
        and(
          eq(neonAuthInvitation.organizationId, organizationId),
          eq(neonAuthInvitation.status, "pending"),
          gt(neonAuthInvitation.expiresAt, now)
        )
      )

    const pendingCount = Number(row?.pendingCount ?? 0)
    const oldestPendingAgeMs = resolveAgeMs(row?.oldestCreatedAt, now)

    return { pendingCount, oldestPendingAgeMs }
  } catch (err) {
    logUnexpectedServerError(
      "rail-pressure: invitation stats query failed",
      err,
      { organizationId }
    )
    // Pressure aggregation never blocks the rail render — a transient DB
    // hiccup degrades to "no badge" rather than crashing the layout.
    return { pendingCount: 0, oldestPendingAgeMs: null }
  }
}

/**
 * Single round-trip for the `integrations` nav badge. Aggregates three
 * concerns in parallel:
 *
 *   - active in-flight import jobs (`uploaded` or `running`)
 *   - failed import-job rows inside the surfacing window
 *   - failed outbound deliveries inside the same window
 *
 * Each sub-query is a tightly bounded `SELECT` against an indexed
 * `(organizationId | endpointId, …)` column pair; the overall layout
 * critical path stays under a single DB round-trip envelope.
 */
async function queryIntegrationsStats(
  organizationId: string,
  surfaceWindowStart: Date,
  now: Date
): Promise<IntegrationsPressureInput> {
  try {
    const [activeJobs, failedJobs, failedDeliveries] = await Promise.all([
      db
        .select({ n: count(importJob.id) })
        .from(importJob)
        .where(
          and(
            eq(importJob.organizationId, organizationId),
            inArray(importJob.state, ["uploaded", "running"])
          )
        )
        .then((rows) => Number(rows[0]?.n ?? 0)),

      db
        .select({
          n: count(importJobRow.id),
          oldestFailureAt: min(importJobRow.updatedAt),
        })
        .from(importJobRow)
        .innerJoin(importJob, eq(importJob.id, importJobRow.jobId))
        .where(
          and(
            eq(importJob.organizationId, organizationId),
            eq(importJobRow.state, "failed"),
            gte(importJobRow.updatedAt, surfaceWindowStart)
          )
        )
        .then((rows) => ({
          count: Number(rows[0]?.n ?? 0),
          oldestFailureAt: rows[0]?.oldestFailureAt ?? null,
        })),

      db
        .select({
          n: count(orgEventDelivery.id),
          oldestFailureAt: min(orgEventDelivery.createdAt),
        })
        .from(orgEventDelivery)
        .innerJoin(
          orgEventEndpoint,
          eq(orgEventEndpoint.id, orgEventDelivery.endpointId)
        )
        .where(
          and(
            eq(orgEventEndpoint.organizationId, organizationId),
            eq(orgEventDelivery.state, "failed"),
            gte(orgEventDelivery.createdAt, surfaceWindowStart),
            isNotNull(orgEventDelivery.completedAt)
          )
        )
        .then((rows) => ({
          count: Number(rows[0]?.n ?? 0),
          oldestFailureAt: rows[0]?.oldestFailureAt ?? null,
        })),
    ])

    const oldestFailureMs = pickOlderAgeMs(
      resolveAgeMs(failedJobs.oldestFailureAt, now),
      resolveAgeMs(failedDeliveries.oldestFailureAt, now)
    )

    return {
      activeImportJobsCount: activeJobs,
      recentFailedJobsCount: failedJobs.count,
      recentFailedDeliveriesCount: failedDeliveries.count,
      oldestFailureAgeMs: oldestFailureMs,
    }
  } catch (err) {
    logUnexpectedServerError(
      "rail-pressure: integrations stats query failed",
      err,
      { organizationId }
    )
    return {
      activeImportJobsCount: 0,
      recentFailedJobsCount: 0,
      recentFailedDeliveriesCount: 0,
      oldestFailureAgeMs: null,
    }
  }
}

function resolveAgeMs(
  value: Date | null | undefined,
  now: Date
): number | null {
  if (!value) {
    return null
  }
  const ageMs = now.getTime() - value.getTime()
  return ageMs >= 0 ? ageMs : 0
}

function pickOlderAgeMs(a: number | null, b: number | null): number | null {
  if (a === null) return b
  if (b === null) return a
  return Math.max(a, b)
}
