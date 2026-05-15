import type { ResolvedOperationalContext } from "#lib/erp/operational-context.shared"

/**
 * Describes the resolved operational context of a shell layout segment.
 *
 * Built by a layout.tsx after session/org resolution and emitted via
 * RouteEnvelopeProvider so client-side error.tsx boundaries can include
 * surface and org context in error reports without a separate server fetch.
 *
 * Shared — no `server-only`; used by both server layouts and the client context bridge.
 */

export type RouteSurface =
  | "locale"
  | "dashboard"
  | "admin"
  | "operator"
  | "auth"
  | "iam"
  | "account"
  /** Cross-org picker (`/{locale}/console`) — signed-in, no active org required. */
  | "console"
  /** Tenant slug segment (`/{locale}/o/{orgSlug}`) before dashboard/admin shells. */
  | "org"
  /** Capability registry (`/{locale}/marketplace`) — top-level, org-scoped. */
  | "marketplace"

export interface RouteEnvelope {
  surface: RouteSurface
  locale: string
  /** Present on org-scoped surfaces after requireOrgSession() resolves. */
  orgSlug?: string
  /** Present when the org session resolves and organizationId is available. */
  orgId?: string
  /**
   * Resolved operational context from resolveOperationalContext().
   * Present on org-scoped surfaces when the resolver ran successfully.
   * Useful for client error boundaries that need context without a re-fetch.
   * Primary resolution happens inside WorkbenchUtilityBarRow (Tier B / Suspense).
   * See ADR-0019.
   */
  operationalContext?: ResolvedOperationalContext | null
}
