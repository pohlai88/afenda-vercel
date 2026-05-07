import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveIamAuditTelemetryEnabled } from "../../lib/auth/iam-audit-telemetry.shared"

describe("iam-audit-telemetry.shared", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("enables when AFENDA_IAM_AUDIT_LOG=1", () => {
    vi.stubEnv("AFENDA_IAM_AUDIT_LOG", "1")
    vi.stubEnv("VERCEL", undefined)
    expect(resolveIamAuditTelemetryEnabled()).toBe(true)
  })

  it("disables when AFENDA_IAM_AUDIT_LOG=0 even on Vercel", () => {
    vi.stubEnv("AFENDA_IAM_AUDIT_LOG", "0")
    vi.stubEnv("VERCEL", "1")
    expect(resolveIamAuditTelemetryEnabled()).toBe(false)
  })

  it("enables on Vercel when unset", () => {
    vi.stubEnv("AFENDA_IAM_AUDIT_LOG", undefined)
    vi.stubEnv("VERCEL", "1")
    expect(resolveIamAuditTelemetryEnabled()).toBe(true)
  })

  it("disables locally when unset", () => {
    vi.stubEnv("AFENDA_IAM_AUDIT_LOG", undefined)
    vi.stubEnv("VERCEL", undefined)
    expect(resolveIamAuditTelemetryEnabled()).toBe(false)
  })
})
