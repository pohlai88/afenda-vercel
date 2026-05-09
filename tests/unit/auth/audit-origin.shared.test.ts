import { describe, expect, it } from "vitest"

import {
  AUDIT_ACTOR_MODE,
  AUDIT_ORIGIN,
  resolveAuditActorModeForInsert,
} from "#lib/auth"

describe("audit-origin.shared", () => {
  it("exposes stable origin literals", () => {
    expect(AUDIT_ORIGIN.production).toBe("production")
    expect(AUDIT_ORIGIN.simulation).toBe("simulation")
  })

  it("exposes stable actor mode literals", () => {
    expect(AUDIT_ACTOR_MODE.user).toBe("user")
    expect(AUDIT_ACTOR_MODE.system).toBe("system")
    expect(AUDIT_ACTOR_MODE.systemSimulation).toBe("system-simulation")
  })

  it("resolveAuditActorModeForInsert prefers user when actor id is non-empty", () => {
    expect(resolveAuditActorModeForInsert("u1")).toBe(AUDIT_ACTOR_MODE.user)
  })

  it("resolveAuditActorModeForInsert falls back to system", () => {
    expect(resolveAuditActorModeForInsert(null)).toBe(AUDIT_ACTOR_MODE.system)
    expect(resolveAuditActorModeForInsert(undefined)).toBe(
      AUDIT_ACTOR_MODE.system
    )
    expect(resolveAuditActorModeForInsert("")).toBe(AUDIT_ACTOR_MODE.system)
    expect(resolveAuditActorModeForInsert("   ")).toBe(AUDIT_ACTOR_MODE.user)
  })
})
