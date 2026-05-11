"use server"

import { revalidatePath } from "next/cache"

import { canActInOrganization } from "#lib/auth"
import { scenarioIdSchema } from "#lib/erp/scenario-types.shared"
import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleOrgDashboardRevalidatePattern,
} from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { isOperationalSimulationEnabled } from "../constants"
import { replayOperationalScenarioForOrganization } from "../data/scenario-replay.server"
import type { SimulationReplayActionResult } from "../types"

export async function replayOrgOperationalScenarioAction(
  scenarioIdRaw: string
): Promise<SimulationReplayActionResult> {
  if (!isOperationalSimulationEnabled()) {
    return {
      ok: false,
      error: "Operational simulation is disabled for this deployment.",
    }
  }

  const parsedId = scenarioIdSchema.safeParse(scenarioIdRaw.trim())
  if (!parsedId.success) {
    return { ok: false, error: "Invalid scenario identifier." }
  }

  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return { ok: false, error: "Admin access required." }
  }

  try {
    const { simulationRunId } =
      await replayOperationalScenarioForOrganization({
        organizationId: session.organizationId,
        scenarioId: parsedId.data,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
      })

    revalidatePath(toLocaleOrgAdminRevalidatePattern("/audit"), "page")
    revalidatePath(toLocaleOrgDashboardRevalidatePattern("/orbit"), "page")

    return { ok: true, simulationRunId }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Scenario replay failed."
    return { ok: false, error: message }
  }
}
