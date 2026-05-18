import type { ResolvedOperationalContext } from "#lib/erp/operational-context.shared"
import type { PortalAudience } from "#lib/portal"

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
  | "apps"
  | "admin"
  | "platform"
  | "auth"
  | "iam"
  | "account"
  /** Cross-org picker (`/{locale}/console`) — signed-in, no active org required. */
  | "console"
  /** Tenant slug segment (`/{locale}/o/{orgSlug}`) before apps/admin shells. */
  | "org"
  /** Portal boundary (`/{locale}/p/{portalSlug}`) for org-owned external surfaces. */
  | "portal"

export type RoutePortalAudience = PortalAudience

export interface RouteEnvelope {
  surface: RouteSurface
  locale: string
  /** Present on org-scoped surfaces after requireOrgSession() resolves. */
  orgSlug?: string
  /** Present when organizationId is available from org session or portal context. */
  orgId?: string
  /** Present on portal-scoped surfaces after portal context resolves. */
  portalSlug?: string
  /** Present on portal-scoped surfaces once the audience registry resolves. */
  portalAudience?: RoutePortalAudience
  /**
   * Resolved operational context from resolveOperationalContext().
   * Present on org-scoped surfaces when the resolver ran successfully.
   * Useful for client error boundaries that need context without a re-fetch.
   * Primary resolution happens inside the app-shell utility bar (Tier B / Suspense).
   * See ADR-0019.
   */
  operationalContext?: ResolvedOperationalContext | null
}
