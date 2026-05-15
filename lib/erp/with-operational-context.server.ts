import "server-only"

import type { ResolvedOperationalContext } from "./operational-context.shared"

/**
 * Enriches Server Action audit metadata with the resolved operational context.
 *
 * Drop-in at any writeIamAuditEvent* call site — the feature module does not
 * need to wire operational scope fields manually. The resolver (in
 * lib/features/operational-scope/server.ts) did the heavy work; this is just
 * the metadata merge.
 *
 * Pure function: no DB access, no feature imports — valid for lib/erp/.
 *
 * Usage:
 * ```ts
 * await writeIamAuditEventFromNextHeaders({
 *   action: "erp.inventory.transfer.record.create",
 *   organizationId,
 *   actorUserId: userId,
 *   resourceType: "inventory.transfer",
 *   resourceId: row.id,
 *   metadata: withOperationalContext(operationalContext, {
 *     transferKind: parsed.data.kind,
 *   }),
 * })
 * ```
 *
 * See ADR-0019 §2.8.
 */
export function withOperationalContext<T extends Record<string, unknown>>(
  context: ResolvedOperationalContext | null | undefined,
  metadata: T
): T & { operationalContext?: Record<string, string | null> } {
  if (!context || Object.keys(context.scopes).length === 0) {
    return metadata
  }

  const operationalContext: Record<string, string | null> = {}
  for (const [scopeType, scope] of Object.entries(context.scopes)) {
    operationalContext[scopeType] = scope.selectedId
  }

  return { ...metadata, operationalContext }
}
