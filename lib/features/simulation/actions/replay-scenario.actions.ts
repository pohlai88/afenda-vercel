"use server"

import { revalidatePath } from "next/cache"

import { scenarioIdSchema } from "#lib/erp/scenario-types.shared"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleOrgAppsRevalidatePattern,
} from "#lib/i18n/locales.shared"

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

  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }
  const session = gate.session

  try {
    const { simulationRunId } = await replayOperationalScenarioForOrganization({
      organizationId: session.organizationId,
      scenarioId: parsedId.data,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
    })

    revalidatePath(toLocaleOrgAdminRevalidatePattern("/audit"), "page")
    revalidatePath(toLocaleOrgAppsRevalidatePattern("/orbit"), "page")

    return { ok: true, simulationRunId }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Scenario replay failed."
    return { ok: false, error: message }
  }
}
