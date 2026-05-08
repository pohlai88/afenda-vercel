import { describe, expect, it } from "vitest"

import {
  LYNX_NL_DEMO_ROW_CAP,
  validateLynxNlDemoSql,
} from "#features/lynx/data/nl-sql-demo-guard.shared"

const ORG = "org-test-11111111-1111-4111-8111-111111111111"

describe("validateLynxNlDemoSql", () => {
  it("accepts a minimal SELECT with org filter and quoted table", () => {
    const q = `SELECT "company", "valuation" FROM "lynx_demo_unicorn" WHERE "organizationId" = '${ORG}'`
    const res = validateLynxNlDemoSql(q, ORG)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.sql.toLowerCase()).toContain("limit")
      expect(res.sql).toContain(`LIMIT ${LYNX_NL_DEMO_ROW_CAP}`)
    }
  })

  it("rejects non-select", () => {
    const res = validateLynxNlDemoSql(
      `DELETE FROM "lynx_demo_unicorn" WHERE "organizationId" = '${ORG}'`,
      ORG
    )
    expect(res.ok).toBe(false)
  })

  it("rejects missing org predicate", () => {
    const res = validateLynxNlDemoSql(
      `SELECT * FROM "lynx_demo_unicorn" LIMIT 10`,
      ORG
    )
    expect(res.ok).toBe(false)
  })

  it("rejects JOIN", () => {
    const res = validateLynxNlDemoSql(
      `SELECT a."company" FROM "lynx_demo_unicorn" a JOIN "lynx_demo_unicorn" b ON true WHERE a."organizationId" = '${ORG}'`,
      ORG
    )
    expect(res.ok).toBe(false)
  })

  it("rejects multiple statements", () => {
    const res = validateLynxNlDemoSql(
      `SELECT 1 FROM "lynx_demo_unicorn" WHERE "organizationId" = '${ORG}'; SELECT 2`,
      ORG
    )
    expect(res.ok).toBe(false)
  })

  it("rejects SQL line comments", () => {
    const res = validateLynxNlDemoSql(
      `SELECT 1 FROM "lynx_demo_unicorn" WHERE "organizationId" = '${ORG}' -- evil`,
      ORG
    )
    expect(res.ok).toBe(false)
  })

  it("rejects wrong FROM table", () => {
    const res = validateLynxNlDemoSql(
      `SELECT * FROM "customers" WHERE "organizationId" = '${ORG}'`,
      ORG
    )
    expect(res.ok).toBe(false)
  })

  it("rejects LIMIT above cap", () => {
    const res = validateLynxNlDemoSql(
      `SELECT "company" FROM "lynx_demo_unicorn" WHERE "organizationId" = '${ORG}' LIMIT 999`,
      ORG
    )
    expect(res.ok).toBe(false)
  })

  it("accepts explicit LIMIT within cap", () => {
    const res = validateLynxNlDemoSql(
      `SELECT "company" FROM "lynx_demo_unicorn" WHERE "organizationId" = '${ORG}' LIMIT 50`,
      ORG
    )
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.sql.toLowerCase()).toContain("limit 50")
    }
  })
})
