/**
 * IAM audit row provenance — shared constants (Edge-safe, no `server-only`).
 * Writers stamp {@link iam_audit_event} columns from AsyncLocalStorage-bound simulation context.
 */
export const AUDIT_ORIGIN = {
  production: "production",
  simulation: "simulation",
} as const

export type AuditOrigin = (typeof AUDIT_ORIGIN)[keyof typeof AUDIT_ORIGIN]

export const AUDIT_ACTOR_MODE = {
  user: "user",
  system: "system",
  systemSimulation: "system-simulation",
} as const

export type AuditActorMode =
  (typeof AUDIT_ACTOR_MODE)[keyof typeof AUDIT_ACTOR_MODE]

/** Default actor mode for non-simulation inserts when no user id is present. */
export function resolveAuditActorModeForInsert(
  actorUserId?: string | null
): AuditActorMode {
  return actorUserId && actorUserId.length > 0
    ? AUDIT_ACTOR_MODE.user
    : AUDIT_ACTOR_MODE.system
}
