import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("#lib/auth/neon.server", () => ({
  auth: {
    organization: {
      inviteMember: vi.fn(),
    },
  },
}))
vi.mock("#lib/auth", () => ({
  assertOrgInviteRateAllowed: vi.fn(async () => ({ ok: true })),
}))
vi.mock(
  "../../lib/features/org-admin/data/hrm-payroll-profile-import.adapter.server",
  () => ({
    hrmPayrollProfileImportAdapter: {
      id: "hrm_payroll_profile_import",
      requiredHeaders: [],
      parseRow: vi.fn(),
      applyRow: vi.fn(),
    },
  })
)
vi.mock(
  "../../lib/features/org-admin/data/hrm-employee-hire.adapter.server",
  () => ({
    hrmEmployeeHireAdapter: {
      id: "hrm_employee_hire",
      requiredHeaders: [],
      parseRow: vi.fn(),
      applyRow: vi.fn(),
    },
  })
)
vi.mock("../../lib/features/hrm/workforce-time-attendance/data/attendance-import.adapter.server.ts", () => ({
  attendanceImportAdapter: {
    id: "hrm_attendance_import",
    requiredHeaders: [],
    parseRow: vi.fn(),
    applyRow: vi.fn(),
  },
}))

import {
  IMPORT_ADAPTERS,
  IMPORT_JOB_STATES,
  IMPORT_ROW_STATES,
  isImportAdapterId,
  isImportJobState,
  isImportRowState,
} from "#features/org-admin/constants"
import { digestCsv, parseCsv } from "#features/org-admin/data/csv-parser.shared"
import { memberInviteAdapter } from "#features/org-admin/data/member-invite.adapter.server"
import { importJobInputSchema } from "#features/org-admin/schemas/import-job-input.schema"
import { memberInviteRowSchema } from "#features/org-admin/schemas/member-invite-row.schema"

describe("ingestion-job constants", () => {
  it("IMPORT_JOB_STATES contains the canonical 5-state lifecycle", () => {
    expect(IMPORT_JOB_STATES).toEqual([
      "uploaded",
      "running",
      "completed",
      "failed",
      "cancelled",
    ])
  })

  it("IMPORT_ROW_STATES is exactly the four staged outcomes", () => {
    expect(IMPORT_ROW_STATES).toEqual([
      "pending",
      "applied",
      "failed",
      "skipped",
    ])
  })

  it("IMPORT_ADAPTERS exposes every registered public adapter", () => {
    expect(IMPORT_ADAPTERS).toEqual([
      "member_invite",
      "hrm_payroll_profile_import",
      "hrm_employee_hire",
      "hrm_attendance_import",
    ])
  })

  it("type guards reject unknown values", () => {
    expect(isImportJobState("queued")).toBe(false)
    expect(isImportRowState("retry")).toBe(false)
    expect(isImportAdapterId("vendor")).toBe(false)
    for (const v of IMPORT_JOB_STATES) expect(isImportJobState(v)).toBe(true)
    for (const v of IMPORT_ROW_STATES) expect(isImportRowState(v)).toBe(true)
    for (const v of IMPORT_ADAPTERS) expect(isImportAdapterId(v)).toBe(true)
  })
})

describe("CSV parser", () => {
  it("parses a simple header + rows", () => {
    const result = parseCsv("email,role\nalice@x.com,member\nbob@x.com,admin")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.headers).toEqual(["email", "role"])
    expect(result.rows).toEqual([
      { email: "alice@x.com", role: "member" },
      { email: "bob@x.com", role: "admin" },
    ])
  })

  it("normalizes header casing/whitespace", () => {
    const result = parseCsv(" Email , Role \nalice@x.com,member")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.headers).toEqual(["email", "role"])
  })

  it("supports CRLF line endings", () => {
    const result = parseCsv("email\r\nalice@x.com\r\nbob@x.com\r\n")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(2)
  })

  it("supports quoted fields with escaped quotes and commas", () => {
    const result = parseCsv(`name,note\n"Alice ""A"" One","hello, world"`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows[0]).toEqual({
      name: 'Alice "A" One',
      note: "hello, world",
    })
  })

  it("treats blank trailing lines as no data", () => {
    const result = parseCsv("email\n\n\n")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(0)
  })

  it("returns an error for empty input", () => {
    const result = parseCsv("")
    expect(result.ok).toBe(false)
  })

  it("digestCsv is deterministic and 64 hex chars", async () => {
    const a = await digestCsv("email\nx@y.com")
    const b = await digestCsv("email\nx@y.com")
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("member-invite adapter", () => {
  it("requires email column", () => {
    expect(memberInviteAdapter.requiredHeaders).toContain("email")
  })

  it("parseRow lowercases + trims emails and defaults role", () => {
    const result = memberInviteAdapter.parseRow({ email: "  Alice@X.com  " })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.email).toBe("alice@x.com")
    expect(result.payload.role).toBe("member")
  })

  it("parseRow accepts admin role", () => {
    const result = memberInviteAdapter.parseRow({
      email: "ops@x.com",
      role: "admin",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.role).toBe("admin")
  })

  it("parseRow rejects invalid email", () => {
    const result = memberInviteAdapter.parseRow({ email: "not-an-email" })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("validation")
    expect(result.field).toBe("email")
  })

  it("parseRow rejects unknown role", () => {
    const result = memberInviteAdapter.parseRow({
      email: "x@y.com",
      role: "owner",
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.field).toBe("role")
  })
})

describe("memberInviteRowSchema", () => {
  it("normalizes upper-case emails", () => {
    const r = memberInviteRowSchema.parse({ email: "X@Y.com" })
    expect(r.email).toBe("x@y.com")
  })

  it("rejects oversized email", () => {
    const long = "a".repeat(360) + "@x.com"
    const r = memberInviteRowSchema.safeParse({ email: long })
    expect(r.success).toBe(false)
  })
})

describe("importJobInputSchema", () => {
  it("rejects unknown adapter", () => {
    const r = importJobInputSchema.safeParse({
      adapter: "vendor",
      csvText: "email\nx@y.com",
    })
    expect(r.success).toBe(false)
  })

  it("rejects empty csvText", () => {
    const r = importJobInputSchema.safeParse({
      adapter: "member_invite",
      csvText: "",
    })
    expect(r.success).toBe(false)
  })

  it("accepts a small valid payload", () => {
    const r = importJobInputSchema.safeParse({
      adapter: "member_invite",
      csvText: "email\nx@y.com",
      filename: "tiny.csv",
    })
    expect(r.success).toBe(true)
  })

  it("rejects payloads larger than the byte limit", () => {
    const big = "email\n" + "x@y.com\n".repeat(40_000)
    const r = importJobInputSchema.safeParse({
      adapter: "member_invite",
      csvText: big,
    })
    expect(r.success).toBe(false)
  })
})
