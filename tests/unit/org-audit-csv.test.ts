import { describe, expect, it } from "vitest"

import type { OrganizationIamAuditExportRow } from "#lib/auth"
import {
  AUDIT_ACTOR_MODE,
  AUDIT_ORIGIN,
  ORG_AUDIT_CSV_HEADER_COLUMNS,
  computeOrganizationIamAuditExportSignature,
  escapeCsvCell,
  formatOrganizationIamAuditCsvDataRow,
  parseCsvFirstField,
  parseOrganizationIamAuditOriginFilterParam,
  verifyOrganizationIamAuditExportCsv,
} from "#lib/auth"

const ORG_AUDIT_CSV_HEADER = ORG_AUDIT_CSV_HEADER_COLUMNS.join(",")

function sampleRow(
  overrides: Partial<OrganizationIamAuditExportRow>
): OrganizationIamAuditExportRow {
  return {
    id: "evt-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    action: "org.test",
    actorUserId: null,
    actorEmail: null,
    resourceType: null,
    resourceId: null,
    path: null,
    metadata: null,
    ipAddress: null,
    userAgent: null,
    auditOrigin: AUDIT_ORIGIN.production,
    simulationRunId: null,
    scenarioId: null,
    scenarioVersion: null,
    auditActorMode: AUDIT_ACTOR_MODE.user,
    ...overrides,
  }
}

describe("parseOrganizationIamAuditOriginFilterParam", () => {
  it("defaults unknown values to production", () => {
    expect(parseOrganizationIamAuditOriginFilterParam(undefined)).toBe(
      "production"
    )
    expect(parseOrganizationIamAuditOriginFilterParam("")).toBe("production")
    expect(parseOrganizationIamAuditOriginFilterParam("nope")).toBe(
      "production"
    )
  })

  it("maps simulated views", () => {
    expect(parseOrganizationIamAuditOriginFilterParam("simulated")).toBe(
      "simulation"
    )
    expect(parseOrganizationIamAuditOriginFilterParam("simulation")).toBe(
      "simulation"
    )
  })

  it("accepts all and production", () => {
    expect(parseOrganizationIamAuditOriginFilterParam("all")).toBe("all")
    expect(parseOrganizationIamAuditOriginFilterParam("production")).toBe(
      "production"
    )
  })
})

describe("escapeCsvCell", () => {
  it("returns plain values unchanged when safe", () => {
    expect(escapeCsvCell("hello")).toBe("hello")
    expect(escapeCsvCell(null)).toBe("")
  })

  it("wraps and escapes quotes and commas", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvCell("a,b")).toBe('"a,b"')
  })

  it("wraps newlines", () => {
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"')
  })
})

describe("formatOrganizationIamAuditCsvDataRow", () => {
  it("formats a row with ISO timestamp", () => {
    const createdAt = new Date("2026-01-02T03:04:05.000Z")
    const line = formatOrganizationIamAuditCsvDataRow({
      id: "evt-1",
      createdAt,
      action: "org.member.invite",
      actorUserId: "u1",
      actorEmail: "a@b.co",
      resourceType: "invitation",
      resourceId: "inv-1",
      path: "/account",
      metadata: null,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla",
      auditOrigin: AUDIT_ORIGIN.production,
      simulationRunId: null,
      scenarioId: null,
      scenarioVersion: null,
      auditActorMode: AUDIT_ACTOR_MODE.user,
    })
    expect(line).toContain("2026-01-02T03:04:05.000Z")
    expect(line).toContain("org.member.invite")
  })
})

describe("parseCsvFirstField", () => {
  it("reads first column when unquoted", () => {
    expect(parseCsvFirstField("abc,def")).toBe("abc")
  })

  it("reads first quoted field with escaped quotes", () => {
    expect(parseCsvFirstField('"a""b",x')).toBe('a"b')
  })
})

describe("verifyOrganizationIamAuditExportCsv", () => {
  const orgId = "org-verify-test"
  const secret = "verify-secret"

  it("accepts BOM + header + signed rows + footers", () => {
    const row1 = formatOrganizationIamAuditCsvDataRow(
      sampleRow({ id: "evt-first" })
    )
    const row2 = formatOrganizationIamAuditCsvDataRow(
      sampleRow({
        id: "evt-last",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
      })
    )
    const n = 2
    const sig = computeOrganizationIamAuditExportSignature({
      organizationId: orgId,
      rowCount: n,
      firstRowId: "evt-first",
      lastRowId: "evt-last",
      secret,
    })
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n${row1}\r\n${row2}\r\n#afenda_audit_footer_v1,#row_count,${n}\r\n#afenda_audit_footer_v1,#signature_sha256,${sig}\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: true,
    })
  })

  it("rejects tampered data with signature_mismatch", () => {
    const row1 = formatOrganizationIamAuditCsvDataRow(
      sampleRow({ id: "evt-first" })
    )
    const row2 = formatOrganizationIamAuditCsvDataRow(
      sampleRow({ id: "evt-last" })
    )
    const n = 2
    const sig = computeOrganizationIamAuditExportSignature({
      organizationId: orgId,
      rowCount: n,
      firstRowId: "evt-first",
      lastRowId: "evt-last",
      secret,
    })
    const tamperedRow2 = row2.replace("evt-last", "evt-LAST")
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n${row1}\r\n${tamperedRow2}\r\n#afenda_audit_footer_v1,#row_count,${n}\r\n#afenda_audit_footer_v1,#signature_sha256,${sig}\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: false,
      reason: "signature_mismatch",
    })
  })

  it("rejects row_count footer vs body mismatch", () => {
    const row1 = formatOrganizationIamAuditCsvDataRow(sampleRow({ id: "a" }))
    const sig = computeOrganizationIamAuditExportSignature({
      organizationId: orgId,
      rowCount: 3,
      firstRowId: "a",
      lastRowId: "z",
      secret,
    })
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n${row1}\r\n#afenda_audit_footer_v1,#row_count,3\r\n#afenda_audit_footer_v1,#signature_sha256,${sig}\r\n`
    const result = verifyOrganizationIamAuditExportCsv(csv, orgId, secret)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain("row_count_mismatch")
    }
  })

  it("accepts empty export (row_count 0, no signature line)", () => {
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n#afenda_audit_footer_v1,#row_count,0\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: true,
    })
  })

  it("rejects empty document", () => {
    expect(verifyOrganizationIamAuditExportCsv("", orgId, secret)).toEqual({
      ok: false,
      reason: "missing_header",
    })
  })

  it("rejects header without id / created_at columns", () => {
    const csv = `foo,bar\r\n#afenda_audit_footer_v1,#row_count,0\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: false,
      reason: "invalid_header",
    })
  })

  it("rejects missing row_count footer", () => {
    const row1 = formatOrganizationIamAuditCsvDataRow(sampleRow({ id: "a" }))
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n${row1}\r\n#afenda_audit_footer_v1,#signature_sha256,ab\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: false,
      reason: "missing_row_count_footer",
    })
  })

  it("rejects signature line when export is empty", () => {
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n#afenda_audit_footer_v1,#row_count,0\r\n#afenda_audit_footer_v1,#signature_sha256,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: false,
      reason: "unexpected_signature_when_empty",
    })
  })

  it("rejects rows without signature footer", () => {
    const row1 = formatOrganizationIamAuditCsvDataRow(sampleRow({ id: "a" }))
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n${row1}\r\n#afenda_audit_footer_v1,#row_count,1\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: false,
      reason: "missing_signature_footer",
    })
  })

  it("rejects malformed signature hex in footer", () => {
    const row1 = formatOrganizationIamAuditCsvDataRow(sampleRow({ id: "a" }))
    const csv = `\uFEFF${ORG_AUDIT_CSV_HEADER}\r\n${row1}\r\n#afenda_audit_footer_v1,#row_count,1\r\n#afenda_audit_footer_v1,#signature_sha256,not-hex\r\n`
    expect(verifyOrganizationIamAuditExportCsv(csv, orgId, secret)).toEqual({
      ok: false,
      reason: "malformed_signature_footer",
    })
  })
})

describe("computeOrganizationIamAuditExportSignature", () => {
  it("is stable for fixed inputs", () => {
    const sig = computeOrganizationIamAuditExportSignature({
      organizationId: "org-1",
      rowCount: 3,
      firstRowId: "a",
      lastRowId: "z",
      secret: "test-secret",
    })
    expect(sig).toMatch(/^[a-f0-9]{64}$/)
    const again = computeOrganizationIamAuditExportSignature({
      organizationId: "org-1",
      rowCount: 3,
      firstRowId: "a",
      lastRowId: "z",
      secret: "test-secret",
    })
    expect(again).toBe(sig)
  })
})
