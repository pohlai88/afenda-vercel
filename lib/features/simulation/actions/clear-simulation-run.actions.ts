"use server"

import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import {
  toLocaleOrgAdminRevalidatePattern,
  toLocaleOrgAppsRevalidatePattern,
} from "#lib/i18n/locales.shared"

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

  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }
  const session = gate.session

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
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/orbit"), "page")

  return {
    ok: true,
    deletedAudit: result.deletedAudit,
  }
}
