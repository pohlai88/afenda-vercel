import "server-only"

import { randomUUID } from "node:crypto"

import { writeIamAuditEvent } from "#lib/auth"
import type { ScenarioId } from "#lib/erp/scenario-types.shared"
import { runWithSimulationContext } from "#lib/erp/simulation-context.server"

import { getOperationalScenarioGraphById } from "./scenario-registry.server"
import type { ReplayOperationalScenarioResult } from "../types"

export type ReplayOperationalScenarioServerInput = {
  organizationId: string
  scenarioId: ScenarioId
  actorUserId: string | null
  actorSessionId: string | null
}

/**
 * Replays a registered scenario through real persistence surfaces.
 *
 * The scenario itself is responsible for driving any planner-native (or other
 * domain) inserts inside the simulation context. This server entry is now
 * narrow: it allocates the run id, opens the AsyncLocalStorage context so
 * downstream {@link writeIamAuditEvent} calls inherit simulation provenance,
 * and writes the canonical `org.simulation.scenario.replay` audit row.
 */
export async function replayOperationalScenarioForOrganization(
  input: ReplayOperationalScenarioServerInput
): Promise<ReplayOperationalScenarioResult> {
  const graph = getOperationalScenarioGraphById(input.scenarioId)
  if (!graph) {
    throw new Error(`Unknown operational scenario: ${input.scenarioId}`)
  }

  const simulationRunId = randomUUID()

  return runWithSimulationContext(
    {
      simulationRunId,
      scenarioId: graph.id,
      scenarioVersion: graph.version,
      seed: graph.seed,
    },
    async () => {
      await writeIamAuditEvent({
        action: "org.simulation.scenario.replay",
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        organizationId: input.organizationId,
        resourceType: "simulation.run",
        resourceId: simulationRunId,
        metadata: {
          scenarioId: graph.id,
          seed: graph.seed,
        },
      })

      return { simulationRunId }
    }
  )
}
