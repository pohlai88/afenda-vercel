"use server"

import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleOrgDashboardRevalidatePattern,
} from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { isOperationalSimulationEnabled } from "../constants"
import { deleteOperationalSimulationRun } from "../data/simulation-clear.server"
import type { SimulationClearActionResult } from "../types"

export async function clearOrgOperationalSimulationRunAction(
  simulationRunIdRaw: string
): Promise<SimulationClearActionResult> {
  if (!isOperationalSimulationEnabled()) {
    return {
      ok: false,
      error: "Operational simulation is disabled for this deployment.",
    }
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

  const simulationRunId = simulationRunIdRaw.trim()
  if (simulationRunId.length < 8) {
    return { ok: false, error: "Invalid simulation run id." }
  }

  const result = await deleteOperationalSimulationRun({
    organizationId: session.organizationId,
    simulationRunId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "org.simulation.scenario.clear",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "simulation.run",
    resourceId: simulationRunId,
    metadata: {
      deletedAudit: result.deletedAudit,
    },
  })

  revalidatePath(toLocaleOrgAdminRevalidatePattern("/audit"), "page")
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/orbit"), "page")

  return {
    ok: true,
    deletedAudit: result.deletedAudit,
  }
}
