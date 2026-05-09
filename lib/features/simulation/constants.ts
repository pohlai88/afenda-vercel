/** Enable replay/clear Server Actions and CLI (never defaulted on in production). */
export const OPERATIONAL_SIMULATION_ENV = "AFENDA_ENABLE_SIMULATION" as const

export const OPERATIONAL_SIMULATION_SCENARIO_VENDOR_PAYMENT_BLOCKED_CERT_EXPIRY =
  "vendor.payment.blocked.cert_expiry" as const

export function isOperationalSimulationEnabled(): boolean {
  return process.env[OPERATIONAL_SIMULATION_ENV] === "1"
}
