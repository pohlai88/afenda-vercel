import "server-only"

import type { ScenarioId } from "#lib/erp/scenario-types.shared"

import type { OperationalScenarioGraph } from "../types"

import { vendorPaymentBlockedCertExpiryScenario } from "./scenario-graphs/vendor-payment-blocked-cert-expiry.scenario"

/**
 * Register one scenario per money-path ERP workflow (payroll finalize, import job, …).
 * Test scale doctrine: docs/testing/erp-test-scale-strategy.md — prefer simulation over
 * Vitest-in-runtime or /api/test routes for cross-module fidelity.
 */
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
