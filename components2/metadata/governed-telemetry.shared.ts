/**
 * Isomorphic dev-only telemetry channel for governed metadata UI.
 *
 * Safe to call from both Server Components (e.g. `GovernedComponentTree` —
 * dataNature mismatch detection) and Client Components (e.g.
 * `GovernedComponentErrorBoundary`). All emissions are gated by
 * `NODE_ENV === "development"`; production observability flows through
 * `iam_audit_event` (governance truth) and OTEL spans (execution map).
 *
 * Do not add a `"use client"` directive here — the `.client.ts` sibling
 * exists for explicit client-side imports and re-exports from this module.
 */

export type GovernedTelemetryBase = {
  type: string
  surfaceKey?: string
}

export type GovernedTelemetryEvent =
  | ({
      name: "governed.render"
      serverType: string
      rendererId?: string
    } & GovernedTelemetryBase)
  | ({
      name: "governed.validation_error"
      reason?: string
      schemaId?: string
    } & GovernedTelemetryBase)
  | ({
      name: "governed.renderer_error"
      rendererId: string
      message: string
    } & GovernedTelemetryBase)
  | ({
      name: "governed.data_nature_mismatch"
      rendererId: string
      observed: string
      accepted: readonly string[]
    } & GovernedTelemetryBase)

export function emitGovernedTelemetry(event: GovernedTelemetryEvent): void {
  if (process.env.NODE_ENV !== "development") {
    return
  }

  // Dev-only structured signal — production observability uses iam_audit_event / OTEL.
  // eslint-disable-next-line no-console
  console.debug("[governed-ui]", event)
}
