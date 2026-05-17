/**
 * Phase 3R — Golden tests for `lib/features/hrm/employee-management/compliance-regulatory-tracking/data/statutory-pack-csv.shared.ts`.
 *
 * Locks down the operator-friendly CSV serializer, the SHA-256 response
 * hash anchor, and the filename / header-format helpers consumed by
 * `app/api/integrations/hrm-statutory-pack-export/[evidenceId]/route.ts`.
 *
 * The serializer is the deterministic edge between in-memory payloads and
 * the bytes an HR officer downloads for offline review or for upload to a
 * bureau portal — so tests assert byte-level shape (column order, RFC
 * 4180 quoting, CRLF line endings, TOTAL footer, hash determinism) rather
 * than just spot-checking shape.
 *
 * No DB, no server-only graph, no I/O. Pure module under test.
 */
import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  computeStatutoryPackResponseHash,
  formatStatutoryPackHashHeader,
  serializeStatutoryPackToCsv,
  STATUTORY_PACK_HASH_HEADER,
  STATUTORY_PACK_HASH_PREFIX,
  statutoryPackFilename,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/statutory-pack-csv.shared.ts"
import type { StatutoryPackPayload } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server.ts"

const CRLF = "\r\n"

// ---------------------------------------------------------------------------
// Payload fixtures (hand-written to keep tests focused on the serializer
// rather than the upstream `buildStatutoryPackFromRuns` graph)
// ---------------------------------------------------------------------------

function makeEpfMonthlyPayload(): StatutoryPackPayload {
  return {
    packType: "epf_monthly",
    formatVersion: "MY-EPF-2025-10",
    body: {
      period: "2026-01",
      countryCode: "MY",
      lines: [
        {
          employeeId: "emp-001",
          employeeNumber: "MY-00001",
          employeeName: "Ahmad Bin Ali",
          grossWages: "5000.00",
          epfEmployee: "550.00",
          epfEmployer: "650.00",
          epfTotal: "1200.00",
        },
        {
          employeeId: "emp-002",
          employeeNumber: "MY-00002",
          employeeName: "Siti Binti Hassan",
          grossWages: "8000.00",
          epfEmployee: "880.00",
          epfEmployer: "1040.00",
          epfTotal: "1920.00",
        },
      ],
      totals: {
        epfEmployee: "1430.00",
        epfEmployer: "1690.00",
        epfTotal: "3120.00",
        grossWages: "13000.00",
      },
    },
  }
}

function makeSocsoMonthlyPayload(): StatutoryPackPayload {
  return {
    packType: "socso_monthly",
    formatVersion: "MY-SOCSO-2024-10",
    body: {
      period: "2026-01",
      countryCode: "MY",
      lines: [
        {
          employeeId: "emp-001",
          employeeNumber: "MY-00001",
          employeeName: "Ahmad Bin Ali",
          grossWages: "5000.00",
          socsoEmployee: "24.75",
          socsoEmployer: "87.50",
          socsoTotal: "112.25",
        },
      ],
      totals: {
        socsoEmployee: "24.75",
        socsoEmployer: "87.50",
        socsoTotal: "112.25",
      },
    },
  }
}

function makeEisMonthlyPayload(): StatutoryPackPayload {
  return {
    packType: "eis_monthly",
    formatVersion: "MY-EIS-2024-10",
    body: {
      period: "2026-01",
      countryCode: "MY",
      lines: [
        {
          employeeId: "emp-001",
          employeeNumber: "MY-00001",
          employeeName: "Ahmad Bin Ali",
          grossWages: "5000.00",
          eisEmployee: "10.00",
          eisEmployer: "10.00",
          eisTotal: "20.00",
        },
      ],
      totals: {
        eisEmployee: "10.00",
        eisEmployer: "10.00",
        eisTotal: "20.00",
      },
    },
  }
}

function makePcbMonthlyPayload(): StatutoryPackPayload {
  return {
    packType: "pcb_monthly",
    formatVersion: "MY-PCB-2026-01",
    body: {
      period: "2026-01",
      countryCode: "MY",
      lines: [
        {
          employeeId: "emp-001",
          employeeNumber: "MY-00001",
          employeeName: "Ahmad Bin Ali",
          grossWages: "5000.00",
          pcb: "148.00",
        },
      ],
      totals: {
        pcb: "148.00",
        grossWages: "5000.00",
      },
    },
  }
}

function makeEaAnnualPayload(): StatutoryPackPayload {
  return {
    packType: "ea_annual",
    formatVersion: "MY-EA-2023-01",
    body: {
      year: "2026",
      countryCode: "MY",
      employees: [
        {
          employeeId: "emp-001",
          employeeNumber: "MY-00001",
          employeeName: "Ahmad Bin Ali",
          grossIncome: "60000.00",
          epfEmployee: "6600.00",
          socsoEmployee: "297.00",
          eisEmployee: "120.00",
          incomeTaxPaid: "1776.00",
          taxableIncome: "53400.00",
        },
      ],
      generatedAt: "2026-12-31T23:59:00.000Z",
    },
  }
}

function makeBorangEPayload(): StatutoryPackPayload {
  return {
    packType: "borang_e_annual",
    formatVersion: "MY-PCB-2026-01",
    body: {
      year: "2026",
      countryCode: "MY",
      employeeCount: 50,
      totalGrossRemuneration: "3000000.00",
      totalIncomeTaxDeducted: "88800.00",
      generatedAt: "2026-12-31T23:59:00.000Z",
    },
  }
}

// ---------------------------------------------------------------------------
// Per-pack-type byte-shape tests
// ---------------------------------------------------------------------------

describe("serializeStatutoryPackToCsv — epf_monthly", () => {
  it("emits the canonical column order with TOTAL footer", () => {
    const result = serializeStatutoryPackToCsv(makeEpfMonthlyPayload())
    const lines = result.csv.split(CRLF)
    expect(lines[0]).toBe(
      "employeeId,employeeNumber,employeeName,grossWages,epfEmployee,epfEmployer,epfTotal"
    )
    expect(lines[1]).toBe(
      "emp-001,MY-00001,Ahmad Bin Ali,5000.00,550.00,650.00,1200.00"
    )
    expect(lines[2]).toBe(
      "emp-002,MY-00002,Siti Binti Hassan,8000.00,880.00,1040.00,1920.00"
    )
    expect(lines[3]).toBe("TOTAL,,,13000.00,1430.00,1690.00,3120.00")
    expect(lines[4]).toBe("")
    expect(result.csv.endsWith(CRLF)).toBe(true)
    expect(result.columnCount).toBe(7)
    expect(result.rowCount).toBe(3)
  })

  it("emits a TOTAL footer with empty totals when none are supplied", () => {
    const payload: StatutoryPackPayload = {
      ...makeEpfMonthlyPayload(),
      body: { ...makeEpfMonthlyPayload().body, totals: undefined },
    }
    const result = serializeStatutoryPackToCsv(payload)
    const lines = result.csv.split(CRLF)
    expect(lines.at(-2)).toBe("TOTAL,,,,,,")
    expect(result.rowCount).toBe(3)
  })

  it("emits header + TOTAL only for an empty pack", () => {
    const payload: StatutoryPackPayload = {
      packType: "epf_monthly",
      formatVersion: "MY-EPF-2025-10",
      body: {
        period: "2026-01",
        countryCode: "MY",
        lines: [],
        totals: {
          epfEmployee: "0.00",
          epfEmployer: "0.00",
          epfTotal: "0.00",
          grossWages: "0.00",
        },
      },
    }
    const result = serializeStatutoryPackToCsv(payload)
    const lines = result.csv.split(CRLF)
    expect(lines).toEqual([
      "employeeId,employeeNumber,employeeName,grossWages,epfEmployee,epfEmployer,epfTotal",
      "TOTAL,,,0.00,0.00,0.00,0.00",
      "",
    ])
    expect(result.rowCount).toBe(1)
  })
})

describe("serializeStatutoryPackToCsv — socso_monthly", () => {
  it("leaves grossWages cell blank in TOTAL since SOCSO totals carry no gross", () => {
    const result = serializeStatutoryPackToCsv(makeSocsoMonthlyPayload())
    const lines = result.csv.split(CRLF)
    expect(lines[0]).toBe(
      "employeeId,employeeNumber,employeeName,grossWages,socsoEmployee,socsoEmployer,socsoTotal"
    )
    expect(lines[1]).toBe(
      "emp-001,MY-00001,Ahmad Bin Ali,5000.00,24.75,87.50,112.25"
    )
    expect(lines[2]).toBe("TOTAL,,,,24.75,87.50,112.25")
    expect(result.columnCount).toBe(7)
    expect(result.rowCount).toBe(2)
  })
})

describe("serializeStatutoryPackToCsv — eis_monthly", () => {
  it("leaves grossWages cell blank in TOTAL since EIS totals carry no gross", () => {
    const result = serializeStatutoryPackToCsv(makeEisMonthlyPayload())
    const lines = result.csv.split(CRLF)
    expect(lines[0]).toBe(
      "employeeId,employeeNumber,employeeName,grossWages,eisEmployee,eisEmployer,eisTotal"
    )
    expect(lines[2]).toBe("TOTAL,,,,10.00,10.00,20.00")
  })
})

describe("serializeStatutoryPackToCsv — pcb_monthly", () => {
  it("emits PCB and grossWages totals on the TOTAL row", () => {
    const result = serializeStatutoryPackToCsv(makePcbMonthlyPayload())
    const lines = result.csv.split(CRLF)
    expect(lines[0]).toBe(
      "employeeId,employeeNumber,employeeName,grossWages,pcb"
    )
    expect(lines[1]).toBe("emp-001,MY-00001,Ahmad Bin Ali,5000.00,148.00")
    expect(lines[2]).toBe("TOTAL,,,5000.00,148.00")
    expect(result.columnCount).toBe(5)
    expect(result.rowCount).toBe(2)
  })
})

describe("serializeStatutoryPackToCsv — ea_annual", () => {
  it("emits the 9-column EA layout with no TOTAL footer (per-employee yearly only)", () => {
    const result = serializeStatutoryPackToCsv(makeEaAnnualPayload())
    const lines = result.csv.split(CRLF)
    expect(lines[0]).toBe(
      "employeeId,employeeNumber,employeeName,grossIncome,epfEmployee,socsoEmployee,eisEmployee,incomeTaxPaid,taxableIncome"
    )
    expect(lines[1]).toBe(
      "emp-001,MY-00001,Ahmad Bin Ali,60000.00,6600.00,297.00,120.00,1776.00,53400.00"
    )
    expect(lines[2]).toBe("")
    expect(result.columnCount).toBe(9)
    expect(result.rowCount).toBe(1)
  })
})

describe("serializeStatutoryPackToCsv — borang_e_annual", () => {
  it("emits a 2-column metric/value summary (no per-employee rows)", () => {
    const result = serializeStatutoryPackToCsv(makeBorangEPayload())
    const lines = result.csv.split(CRLF)
    expect(lines[0]).toBe("metric,value")
    expect(lines[1]).toBe("year,2026")
    expect(lines[2]).toBe("countryCode,MY")
    expect(lines[3]).toBe("employeeCount,50")
    expect(lines[4]).toBe("totalGrossRemuneration,3000000.00")
    expect(lines[5]).toBe("totalIncomeTaxDeducted,88800.00")
    expect(result.columnCount).toBe(2)
    expect(result.rowCount).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// RFC 4180 quoting — block-merge guard
// ---------------------------------------------------------------------------

describe("RFC 4180 quoting in serializeStatutoryPackToCsv", () => {
  function payloadWithName(name: string): StatutoryPackPayload {
    return {
      packType: "epf_monthly",
      formatVersion: "MY-EPF-2025-10",
      body: {
        period: "2026-01",
        countryCode: "MY",
        lines: [
          {
            employeeId: "emp-001",
            employeeNumber: "MY-00001",
            employeeName: name,
            grossWages: "5000.00",
            epfEmployee: "550.00",
            epfEmployer: "650.00",
            epfTotal: "1200.00",
          },
        ],
        totals: {
          epfEmployee: "550.00",
          epfEmployer: "650.00",
          epfTotal: "1200.00",
          grossWages: "5000.00",
        },
      },
    }
  }

  it("quotes a cell containing a comma", () => {
    const result = serializeStatutoryPackToCsv(payloadWithName("Lim, John"))
    const lines = result.csv.split(CRLF)
    expect(lines[1]).toContain('"Lim, John"')
  })

  it("escapes embedded double-quotes by doubling them", () => {
    const result = serializeStatutoryPackToCsv(
      payloadWithName('Maria "Mia" Tan')
    )
    const lines = result.csv.split(CRLF)
    expect(lines[1]).toContain('"Maria ""Mia"" Tan"')
  })

  it("quotes (and preserves) embedded CR / LF", () => {
    const result = serializeStatutoryPackToCsv(
      payloadWithName("Multi\r\nLine\nName")
    )
    expect(result.csv).toContain('"Multi\r\nLine\nName"')
  })

  it("passes UTF-8 unicode names through without quoting", () => {
    const result = serializeStatutoryPackToCsv(payloadWithName("陳大文"))
    const lines = result.csv.split(CRLF)
    expect(lines[1].split(",")[2]).toBe("陳大文")
  })

  it("does not quote plain ASCII identifiers and numbers", () => {
    const result = serializeStatutoryPackToCsv(payloadWithName("Ahmad Ali"))
    const lines = result.csv.split(CRLF)
    expect(lines[1]).toBe(
      "emp-001,MY-00001,Ahmad Ali,5000.00,550.00,650.00,1200.00"
    )
  })
})

// ---------------------------------------------------------------------------
// Determinism — guards the response-hash contract
// ---------------------------------------------------------------------------

describe("CSV output is byte-deterministic for fixed input", () => {
  const payloads: ReadonlyArray<readonly [string, StatutoryPackPayload]> = [
    ["epf_monthly", makeEpfMonthlyPayload()],
    ["socso_monthly", makeSocsoMonthlyPayload()],
    ["eis_monthly", makeEisMonthlyPayload()],
    ["pcb_monthly", makePcbMonthlyPayload()],
    ["ea_annual", makeEaAnnualPayload()],
    ["borang_e_annual", makeBorangEPayload()],
  ] as const

  it.each(payloads)(
    "%s — serializing twice yields identical bytes",
    (_label, payload) => {
      const a = serializeStatutoryPackToCsv(payload)
      const b = serializeStatutoryPackToCsv(payload)
      expect(b.csv).toBe(a.csv)
      expect(b.columnCount).toBe(a.columnCount)
      expect(b.rowCount).toBe(a.rowCount)
    }
  )
})

// ---------------------------------------------------------------------------
// Response-hash anchor
// ---------------------------------------------------------------------------

describe("computeStatutoryPackResponseHash", () => {
  it("matches Node createHash sha-256 over the same UTF-8 bytes", () => {
    const input = "anything,really\r\n陳大文,42\r\n"
    const expected = createHash("sha256").update(input, "utf8").digest("hex")
    expect(computeStatutoryPackResponseHash(input)).toBe(expected)
  })

  it("is deterministic across the CSV body for a fixed payload", () => {
    const payload = makeEpfMonthlyPayload()
    const csv = serializeStatutoryPackToCsv(payload).csv
    const a = computeStatutoryPackResponseHash(csv)
    const b = computeStatutoryPackResponseHash(csv)
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it("differs when the underlying payload changes by even one digit", () => {
    const original = makeEpfMonthlyPayload()
    const tampered: StatutoryPackPayload = {
      ...original,
      body: {
        ...original.body,
        totals: {
          ...(original.body as { totals: Record<string, string> }).totals,
          epfTotal: "3120.01",
        },
      },
    }
    const a = computeStatutoryPackResponseHash(
      serializeStatutoryPackToCsv(original).csv
    )
    const b = computeStatutoryPackResponseHash(
      serializeStatutoryPackToCsv(tampered).csv
    )
    expect(b).not.toBe(a)
  })
})

// ---------------------------------------------------------------------------
// Header + filename helpers
// ---------------------------------------------------------------------------

describe("header / filename helpers", () => {
  it("X-Afenda-Pack-Hash + sha256 prefix are wired to the documented header name", () => {
    expect(STATUTORY_PACK_HASH_HEADER).toBe("X-Afenda-Pack-Hash")
    expect(STATUTORY_PACK_HASH_PREFIX).toBe("sha256")
  })

  it("formatStatutoryPackHashHeader produces sha256=<hex>", () => {
    const hashHex = "a".repeat(64)
    expect(formatStatutoryPackHashHeader(hashHex)).toBe(`sha256=${hashHex}`)
  })

  it("statutoryPackFilename embeds pack type + country + period start + format extension", () => {
    expect(
      statutoryPackFilename({
        packType: "epf_monthly",
        countryCode: "MY",
        periodStart: "2026-01-01",
        format: "json",
      })
    ).toBe("hrm-epf_monthly-MY-2026-01-01.json")

    expect(
      statutoryPackFilename({
        packType: "socso_monthly",
        countryCode: "MY",
        periodStart: "2026-01-01",
        format: "csv",
      })
    ).toBe("hrm-socso_monthly-MY-2026-01-01.csv")
  })
})
