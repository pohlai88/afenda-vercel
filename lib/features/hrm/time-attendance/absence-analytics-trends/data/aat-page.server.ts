import "server-only"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { logUnexpectedServerError } from "#lib/logger.server"

import type { AatPeriodKey, AatScopeKey } from "../schemas/aat.schema"
import type { AatThresholdConfig } from "../schemas/aat-threshold.schema"
import type { AatSurfaceAccess } from "./aat-access.server"
import {
  buildAatOrgAnalyticsSnapshot,
  type AatOrgAnalyticsSnapshot,
} from "./aat-analytics.queries.server"
import { findAatManagerContextForUser } from "./aat-employee-context.server"
import { getAatThresholdConfigForOrg } from "./aat-threshold.queries.server"
import { HRM_AAT_AUDIT } from "../aat.contract"

export type AbsenceAnalyticsPageData =
  | {
      ok: true
      snapshot: AatOrgAnalyticsSnapshot
      thresholds: AatThresholdConfig
    }
  | { ok: false }

export async function loadAbsenceAnalyticsPageData(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  period: AatPeriodKey
  scope: AatScopeKey
  access: AatSurfaceAccess
}): Promise<AbsenceAnalyticsPageData> {
  try {
    const managerContext =
      input.scope === "team"
        ? await findAatManagerContextForUser({
            organizationId: input.organizationId,
            userId: input.userId,
          })
        : null

    if (input.scope === "team" && !managerContext) {
      return { ok: false }
    }

    const thresholds = await getAatThresholdConfigForOrg(input.organizationId)
    const snapshot = await buildAatOrgAnalyticsSnapshot({
      organizationId: input.organizationId,
      period: input.period,
      scope: input.scope,
      managerEmployeeId: managerContext?.employeeId ?? null,
      canViewSensitiveReasons: input.access.canViewSensitiveReasons,
      thresholds,
    })

    if (input.sessionId) {
      after(() =>
        writeIamAuditEventFromNextHeaders({
          action: HRM_AAT_AUDIT.snapshotGenerate,
          actorUserId: input.userId,
          actorSessionId: input.sessionId,
          organizationId: input.organizationId,
          resourceType: "hrm_absence_analytics_snapshot",
          resourceId: `${snapshot.scope}-${snapshot.period}-${snapshot.range.endDate}`,
          metadata: {
            period: snapshot.period,
            scope: snapshot.scope,
            activeEmployeeCount: snapshot.activeEmployeeCount,
            absenceRate: snapshot.absenceRate,
          },
        })
      )
    }

    return { ok: true, snapshot, thresholds }
  } catch (error) {
    logUnexpectedServerError(
      "aat: loadAbsenceAnalyticsPageData failed",
      error,
      { feature: "hrm.absence_analytics" }
    )
    return { ok: false }
  }
}
