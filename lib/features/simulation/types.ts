import type { ScenarioId } from "#lib/erp/scenario-types.shared"

// Note: previously this file declared a `SimulationProvenance` type plus a
// `simulationProvenancePayload` helper. Both were superseded by the canonical
// `AUDIT_ORIGIN` / actor-mode primitives in `lib/auth/audit-origin.shared.ts`
// once provenance moved to AsyncLocalStorage (`simulation-context.server.ts`),
// leaving them with no consumers. They were removed to keep the public surface
// honest — re-introduce only if a writer has to build provenance outside the
// AsyncLocalStorage flow.

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
