"use client"

/**
 * Client-side facade for the isomorphic telemetry channel.
 *
 * Exists so client islands can keep the explicit `.client` import boundary
 * marker even though the implementation lives in `.shared.ts`.
 */
export {
  emitGovernedTelemetry,
  type GovernedTelemetryBase,
  type GovernedTelemetryEvent,
} from "./governed-telemetry.shared"
