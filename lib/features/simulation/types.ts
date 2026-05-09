import type {
  TemporalNext,
  TemporalNow,
  TemporalPast,
} from "#lib/erp/temporal-spine.shared"
import type { ScenarioId } from "#lib/erp/scenario-types.shared"

import type {
  OneThingCounterparty,
  OneThingImpact,
  OneThingLinkage,
  OneThingProvenance,
} from "#features/onething"
import type { OneThingSimulationProvenance } from "#features/onething/server"

/** Authoritative operational narrative slice replayed into OneThing + IAM audit. */
export type OperationalScenarioOneThingSlice = {
  title: string
  consequence: string
  severity: string
  state: string
  dueAt?: Date | null
  assigneeUserId?: string | null
  temporalPast?: TemporalPast
  temporalNow?: TemporalNow
  temporalNext?: TemporalNext
  linkage?: OneThingLinkage | null
  counterparty?: OneThingCounterparty | null
  provenance?: OneThingProvenance | null
  impact?: OneThingImpact | null
}

export type OperationalScenarioGraph = {
  id: ScenarioId
  version: number
  /** Deterministic replay discriminator — stable across CI / screenshots. */
  seed: string
  oneThing: OperationalScenarioOneThingSlice
}

export type ReplayOperationalScenarioResult = {
  simulationRunId: string
  oneThingId: string
}

export type SimulationReplayActionResult =
  | { ok: true; simulationRunId: string; oneThingId: string }
  | { ok: false; error: string }

export type SimulationClearActionResult =
  | { ok: true; deletedAudit: number; deletedOneThing: number }
  | { ok: false; error: string }

/** @internal — satisfies provenance typing without widening insertOrgOneThing args. */
export function simulationProvenancePayload(input: {
  simulationRunId: string
  scenarioId: string
  scenarioVersion: number
  simulationSeed: string
}): OneThingSimulationProvenance {
  return {
    auditOrigin: "simulation",
    simulationRunId: input.simulationRunId,
    scenarioId: input.scenarioId,
    scenarioVersion: input.scenarioVersion,
    simulationSeed: input.simulationSeed,
  }
}
