import type { ScenarioId } from "#lib/erp/scenario-types.shared"

export type SimulationProvenance = {
  auditOrigin: "simulation"
  simulationRunId: string
  scenarioId: string
  scenarioVersion: number
  simulationSeed: string
}

export type OperationalScenarioGraph = {
  id: ScenarioId
  version: number
  /** Deterministic replay discriminator — stable across CI / screenshots. */
  seed: string
}

export type ReplayOperationalScenarioResult = {
  simulationRunId: string
}

export type SimulationReplayActionResult =
  | { ok: true; simulationRunId: string }
  | { ok: false; error: string }

export type SimulationClearActionResult =
  | { ok: true; deletedAudit: number }
  | { ok: false; error: string }

/** @internal — satisfies provenance typing for simulation context wrappers. */
export function simulationProvenancePayload(input: {
  simulationRunId: string
  scenarioId: string
  scenarioVersion: number
  simulationSeed: string
}): SimulationProvenance {
  return {
    auditOrigin: "simulation",
    simulationRunId: input.simulationRunId,
    scenarioId: input.scenarioId,
    scenarioVersion: input.scenarioVersion,
    simulationSeed: input.simulationSeed,
  }
}
