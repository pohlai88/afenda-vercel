import { OPERATIONAL_SIMULATION_SCENARIO_VENDOR_PAYMENT_BLOCKED_CERT_EXPIRY } from "../../constants"
import type { OperationalScenarioGraph } from "../../types"

/**
 * Procurement ↔ finance hold narrative — proves temporal spine + IAM provenance
 * without claiming shipped purchase/compliance modules beyond OneThing.
 */
export const vendorPaymentBlockedCertExpiryScenario: OperationalScenarioGraph =
  {
    id: OPERATIONAL_SIMULATION_SCENARIO_VENDOR_PAYMENT_BLOCKED_CERT_EXPIRY,
    version: 1,
    seed: "vendor.payment.blocked.cert_expiry:v1",
    oneThing: {
      title:
        "Vendor payment blocked while halal certification is expired for three posted invoices",
      consequence:
        "Finance matched three disbursements to the vendor batch during the certification lapse window. Procurement uploaded a replacement certificate to Knowledge 72 hours ago, but the declaration has not been formally activated — disbursements remain payment-held under POL-HALAL-001.\n\nApprove the replacement certification chain or reject the batch and reopen sourcing.",
      severity: "critical",
      state: "blocked",
      temporalPast: {
        originNote:
          "Supplier uploaded a replacement halal certificate artifact into Knowledge; legacy declaration expired at T−24h.",
        triggeredBy: "compliance.calendar.expiry",
        policyRef: "POL-HALAL-001",
        sourceRecordRef: {
          module: "knowledge",
          id: "sim-halal-cert-replacement",
          label: "Replacement halal certificate (simulated)",
        },
      },
      temporalNow: {
        consequence:
          "Three vendor invoices are payment-held until valid halal documentation is active in governance.",
        blocker:
          "Prior halal declaration expired; finance rules block disbursement for the matched invoice batch.",
        nextSafeAction:
          "Approve the replacement certification chain or reject the batch and notify procurement.",
      },
      temporalNext: {
        failureConsequence:
          "If unresolved, automatic procurement freeze extends to parent supplier agreements under the same policy family.",
      },
      provenance: {
        kind: "system",
        source: "simulation.replay",
        note: "operational_simulation:vendor_cert_hold",
      },
    },
  }
