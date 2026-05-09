import "server-only"

import type { ScenarioId } from "#lib/erp/scenario-types.shared"

import type { OperationalScenarioGraph } from "../types"

import { vendorPaymentBlockedCertExpiryScenario } from "./scenario-graphs/vendor-payment-blocked-cert-expiry.scenario"

const GRAPHS: readonly OperationalScenarioGraph[] = [
  vendorPaymentBlockedCertExpiryScenario,
]

const BY_ID = new Map<ScenarioId, OperationalScenarioGraph>(
  GRAPHS.map((g) => [g.id, g])
)

export function listOperationalScenarioGraphs(): readonly OperationalScenarioGraph[] {
  return GRAPHS
}

export function getOperationalScenarioGraphById(
  id: ScenarioId
): OperationalScenarioGraph | undefined {
  return BY_ID.get(id)
}
