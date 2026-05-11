import { OPERATIONAL_SIMULATION_SCENARIO_VENDOR_PAYMENT_BLOCKED_CERT_EXPIRY } from "../../constants"
import type { OperationalScenarioGraph } from "../../types"

/**
 * Procurement ↔ finance hold narrative — proves temporal spine + IAM provenance.
 * Today this scenario writes only the canonical IAM audit replay row; planner
 * (or other domain) inserts will be added when their modules ship native
 * scenario hooks.
 */
export const vendorPaymentBlockedCertExpiryScenario: OperationalScenarioGraph =
  {
    id: OPERATIONAL_SIMULATION_SCENARIO_VENDOR_PAYMENT_BLOCKED_CERT_EXPIRY,
    version: 1,
    seed: "vendor.payment.blocked.cert_expiry:v1",
  }
