import "server-only"

import { randomUUID } from "node:crypto"

import { writeIamAuditEvent } from "#lib/auth"
import type { ScenarioId } from "#lib/erp/scenario-types.shared"
import { runWithSimulationContext } from "#lib/erp/simulation-context.server"
import {
  ensureDefaultOneThingListForOrg,
  insertOrgOneThing,
} from "#features/onething/server"

import { simulationProvenancePayload } from "../types"

import { getOperationalScenarioGraphById } from "./scenario-registry.server"
import type { ReplayOperationalScenarioResult } from "../types"

export type ReplayOperationalScenarioServerInput = {
  organizationId: string
  scenarioId: ScenarioId
  actorUserId: string | null
  actorSessionId: string | null
}

/**
 * Replays a registered scenario through real persistence surfaces:
 * `onething` insert + IAM audit rows, all stamped with simulation provenance via ALS.
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
      const listId = await ensureDefaultOneThingListForOrg(input.organizationId)
      const ot = graph.oneThing

      const provenance = simulationProvenancePayload({
        simulationRunId,
        scenarioId: graph.id,
        scenarioVersion: graph.version,
        simulationSeed: graph.seed,
      })

      const row = await insertOrgOneThing({
        listId,
        organizationId: input.organizationId,
        title: ot.title,
        consequence: ot.consequence,
        severity: ot.severity,
        dueAt: ot.dueAt ?? null,
        assigneeUserId: ot.assigneeUserId ?? null,
        recurrenceRule: null,
        state: ot.state,
        temporalPast: ot.temporalPast,
        temporalNow: ot.temporalNow,
        temporalNext: ot.temporalNext,
        linkage: ot.linkage ?? null,
        counterparty: ot.counterparty ?? null,
        provenance: ot.provenance ?? null,
        impact: ot.impact ?? null,
        simulationProvenance: provenance,
      })

      await writeIamAuditEvent({
        action: "erp.onething.consequence.create",
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        organizationId: input.organizationId,
        resourceType: "onething",
        resourceId: row.id,
        metadata: {
          scenarioId: graph.id,
          simulationRunId,
        },
      })

      await writeIamAuditEvent({
        action: "org.simulation.scenario.replay",
        actorUserId: input.actorUserId,
        actorSessionId: input.actorSessionId,
        organizationId: input.organizationId,
        resourceType: "simulation.run",
        resourceId: simulationRunId,
        metadata: {
          scenarioId: graph.id,
          oneThingId: row.id,
          seed: graph.seed,
        },
      })

      return { simulationRunId, oneThingId: row.id }
    }
  )
}
