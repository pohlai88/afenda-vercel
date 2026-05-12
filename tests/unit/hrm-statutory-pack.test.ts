/**
 * Golden tests for statutory-pack.server.ts
 * Phase 3C acceptance criterion:
 *   statutory packs produced for the fixture; resulting bytes match known-good fixture;
 *   reverting via re-finalization is rejected (idempotency via inputHash).
 */
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buildStatutoryPackFromRuns } from "../../lib/features/hrm/data/statutory-pack.server"
import { malaysia2026_01RulePack } from "../../lib/features/hrm/data/rule-packs/malaysia/my-2026-01.rule-pack"
import type { StatutoryPackRunInput } from "../../lib/features/hrm/data/statutory-pack.server"

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRun(
  overrides?: Partial<StatutoryPackRunInput>
): StatutoryPackRunInput {
  return {
    runId: "run-001",
    employeeId: "emp-001",
    employeeNumber: "MY-00001",
    employeeName: "Ahmad Bin Ali",
    periodId: "period-2026-01",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    grossPay: "5000.00",
    netPay: "4267.00",
    lines: [
      { lineKind: "earning", code: "BASIC", amount: "5000.00" },
      { lineKind: "employee_deduction", code: "EPF_EE", amount: "-550.00" },
      { lineKind: "employer_contribution", code: "EPF_ER", amount: "650.00" },
      { lineKind: "employee_deduction", code: "SOCSO_EE", amount: "-24.75" },
      { lineKind: "employer_contribution", code: "SOCSO_ER", amount: "-87.50" },
      { lineKind: "employee_deduction", code: "EIS_EE", amount: "-10.00" },
      { lineKind: "employer_contribution", code: "EIS_ER", amount: "-10.00" },
      { lineKind: "tax", code: "PCB", amount: "-148.00" },
      { lineKind: "employer_contribution", code: "HRDF", amount: "50.00" },
    ],
    ...overrides,
  }
}

function makeHighEarnerRun(): StatutoryPackRunInput {
  return {
    runId: "run-002",
    employeeId: "emp-002",
    employeeNumber: "MY-00002",
    employeeName: "Siti Binti Hassan",
    periodId: "period-2026-01",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    grossPay: "8000.00",
    netPay: "6800.00",
    lines: [
      { lineKind: "earning", code: "BASIC", amount: "8000.00" },
      { lineKind: "employee_deduction", code: "EPF_EE", amount: "-880.00" },
      { lineKind: "employer_contribution", code: "EPF_ER", amount: "-960.00" },
      { lineKind: "employee_deduction", code: "SOCSO_EE", amount: "-29.75" },
      { lineKind: "employer_contribution", code: "SOCSO_ER", amount: "-74.50" },
      { lineKind: "employee_deduction", code: "EIS_EE", amount: "-12.00" },
      { lineKind: "employer_contribution", code: "EIS_ER", amount: "-12.00" },
      { lineKind: "tax", code: "PCB", amount: "-320.00" },
    ],
  }
}

// ---------------------------------------------------------------------------
// EPF monthly pack
// ---------------------------------------------------------------------------

describe("buildStatutoryPackFromRuns — epf_monthly", () => {
  it("produces correct pack structure for single employee", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()]
    )

    expect(result.payload.packType).toBe("epf_monthly")
    expect(result.payload.formatVersion).toBe("MY-EPF-2025-10")

    const body = result.payload.body as {
      lines: { epfEmployee: string; epfEmployer: string; grossWages: string }[]
      totals: Record<string, string>
    }

    expect(body.lines).toHaveLength(1)
    expect(body.lines[0]!.epfEmployee).toBe("550.00")
    expect(body.lines[0]!.epfEmployer).toBe("650.00")
    expect(body.lines[0]!.grossWages).toBe("5000.00")

    // Totals
    expect(body.totals.epfEmployee).toBe("550.00")
    expect(body.totals.epfEmployer).toBe("650.00")
    expect(body.totals.epfTotal).toBe("1200.00")
  })

  it("sums correctly for multiple employees", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun(), makeHighEarnerRun()]
    )

    const body = result.payload.body as {
      lines: unknown[]
      totals: Record<string, string>
    }
    expect(body.lines).toHaveLength(2)
    expect(body.totals.epfEmployee).toBe("1430.00") // 550 + 880
    expect(body.totals.epfEmployer).toBe("1610.00") // 650 + 960
  })

  it("produces non-empty inputHash and outputHash", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()]
    )
    expect(result.inputHash).toMatch(/^[0-9a-f]{64}$/)
    expect(result.outputHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("is idempotent — same inputs → same hashes", () => {
    const r1 = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()]
    )
    const r2 = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()]
    )
    expect(r1.inputHash).toBe(r2.inputHash)
    expect(r1.outputHash).toBe(r2.outputHash)
  })

  it("different inputs → different inputHash", () => {
    const r1 = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()]
    )
    const r2 = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun({ grossPay: "6000.00" })]
    )
    expect(r1.inputHash).not.toBe(r2.inputHash)
  })

  it("is order-independent — same runs in different order → same inputHash", () => {
    const run1 = makeRun()
    const run2 = makeHighEarnerRun()
    const r1 = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [run1, run2]
    )
    const r2 = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [run2, run1]
    )
    expect(r1.inputHash).toBe(r2.inputHash)
    expect(r1.outputHash).toBe(r2.outputHash)
  })
})

// ---------------------------------------------------------------------------
// SOCSO monthly pack
// ---------------------------------------------------------------------------

describe("buildStatutoryPackFromRuns — socso_monthly", () => {
  it("produces correct socso pack", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "socso_monthly",
      [makeRun()]
    )
    expect(result.payload.packType).toBe("socso_monthly")
    const body = result.payload.body as {
      lines: { socsoEmployee: string; socsoEmployer: string }[]
      totals: Record<string, string>
    }
    expect(body.lines[0]!.socsoEmployee).toBe("24.75")
    expect(body.lines[0]!.socsoEmployer).toBe("87.50")
    expect(body.totals.socsoTotal).toBe("112.25")
  })
})

// ---------------------------------------------------------------------------
// EIS monthly pack
// ---------------------------------------------------------------------------

describe("buildStatutoryPackFromRuns — eis_monthly", () => {
  it("produces correct eis pack", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "eis_monthly",
      [makeRun()]
    )
    expect(result.payload.packType).toBe("eis_monthly")
    const body = result.payload.body as {
      lines: { eisEmployee: string; eisEmployer: string }[]
      totals: Record<string, string>
    }
    expect(body.lines[0]!.eisEmployee).toBe("10.00")
    expect(body.lines[0]!.eisEmployer).toBe("10.00")
    expect(body.totals.eisTotal).toBe("20.00")
  })
})

// ---------------------------------------------------------------------------
// PCB monthly pack
// ---------------------------------------------------------------------------

describe("buildStatutoryPackFromRuns — pcb_monthly", () => {
  it("produces correct pcb pack", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "pcb_monthly",
      [makeRun()]
    )
    expect(result.payload.packType).toBe("pcb_monthly")
    const body = result.payload.body as {
      lines: { pcb: string }[]
      totals: Record<string, string>
    }
    expect(body.lines[0]!.pcb).toBe("148.00")
    expect(body.totals.pcb).toBe("148.00")
  })
})

// ---------------------------------------------------------------------------
// EA annual pack (aggregates across multiple runs / months)
// ---------------------------------------------------------------------------

describe("buildStatutoryPackFromRuns — ea_annual", () => {
  it("aggregates multiple runs for the same employee across months", () => {
    const janRun = makeRun({
      runId: "jan",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    })
    const febRun = makeRun({
      runId: "feb",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
    })

    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [janRun, febRun]
    )
    expect(result.payload.packType).toBe("ea_annual")
    const body = result.payload.body as {
      employees: Array<{ grossIncome: string; epfEmployee: string }>
    }
    // One employee, two months summed
    expect(body.employees).toHaveLength(1)
    expect(body.employees[0]!.grossIncome).toBe("10000.00") // 5000 * 2
    expect(body.employees[0]!.epfEmployee).toBe("1100.00") // 550 * 2
  })

  it("handles multiple distinct employees", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun(), makeHighEarnerRun()]
    )
    const body = result.payload.body as { employees: unknown[] }
    expect(body.employees).toHaveLength(2)
  })

  it("format version is ea leave version", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun()]
    )
    expect(result.payload.formatVersion).toBe("MY-EA-2023-01")
  })
})

// ---------------------------------------------------------------------------
// Borang E annual
// ---------------------------------------------------------------------------

describe("buildStatutoryPackFromRuns — borang_e_annual", () => {
  it("produces correct summary for Borang E", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "borang_e_annual",
      [makeRun(), makeHighEarnerRun()]
    )
    expect(result.payload.packType).toBe("borang_e_annual")
    const body = result.payload.body as {
      employeeCount: number
      totalGrossRemuneration: string
      totalIncomeTaxDeducted: string
    }
    expect(body.employeeCount).toBe(2)
    expect(body.totalGrossRemuneration).toBe("13000.00") // 5000 + 8000
    expect(body.totalIncomeTaxDeducted).toBe("468.00") // 148 + 320
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("buildStatutoryPackFromRuns — edge cases", () => {
  it("handles employee with no matching lines (all zeros)", () => {
    const run = makeRun({
      lines: [{ lineKind: "earning", code: "BASIC", amount: "5000.00" }],
    })
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [run]
    )
    const body = result.payload.body as {
      lines: { epfEmployee: string; epfEmployer: string }[]
    }
    expect(body.lines[0]!.epfEmployee).toBe("0.00")
    expect(body.lines[0]!.epfEmployer).toBe("0.00")
  })

  it("handles empty runs array with unknown period gracefully", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "pcb_monthly",
      []
    )
    expect(result.payload.packType).toBe("pcb_monthly")
    const body = result.payload.body as { period: string; lines: unknown[] }
    expect(body.period).toBe("unknown")
    expect(body.lines).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Phase 3S — Determinism contract for EA / Borang E (the two pack types
// whose hashed body embeds `generatedAt`).
//
// Pre-3S, both builders called `new Date()` internally — making
// `outputHash` non-deterministic and breaking every re-derive code path
// (export, retry, re-submit) for annual packs because the rebuilt hash
// could never match the stored one.
//
// Phase 3S threads an explicit `now: Date` through `buildStatutoryPackFromRuns`,
// the upsert mutation's `generatedAt` column, and every receiver-side caller
// (`evidence.generatedAt` / `candidate.priorGeneratedAt`).
// ---------------------------------------------------------------------------

const FIXED_INSTANT_A = new Date("2026-12-31T23:59:00.000Z")
const FIXED_INSTANT_B = new Date("2027-01-01T00:00:01.000Z")

describe("Phase 3S — explicit `now` makes EA / Borang E hashes deterministic", () => {
  it("ea_annual: same runs + same `now` → identical outputHash", () => {
    const a = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun()],
      { now: FIXED_INSTANT_A }
    )
    const b = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun()],
      { now: FIXED_INSTANT_A }
    )
    expect(b.outputHash).toBe(a.outputHash)
    expect(b.inputHash).toBe(a.inputHash)
  })

  it("ea_annual: same runs + different `now` → different outputHash (regression sentinel)", () => {
    const a = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun()],
      { now: FIXED_INSTANT_A }
    )
    const b = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun()],
      { now: FIXED_INSTANT_B }
    )
    expect(b.outputHash).not.toBe(a.outputHash)
    expect(b.inputHash).toBe(a.inputHash)
  })

  it("ea_annual: payload `generatedAt` reflects the passed `now` exactly", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun()],
      { now: FIXED_INSTANT_A }
    )
    const body = result.payload.body as { generatedAt: string }
    expect(body.generatedAt).toBe(FIXED_INSTANT_A.toISOString())
  })

  it("borang_e_annual: same runs + same `now` → identical outputHash", () => {
    const a = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "borang_e_annual",
      [makeRun(), makeHighEarnerRun()],
      { now: FIXED_INSTANT_A }
    )
    const b = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "borang_e_annual",
      [makeRun(), makeHighEarnerRun()],
      { now: FIXED_INSTANT_A }
    )
    expect(b.outputHash).toBe(a.outputHash)
    expect(b.inputHash).toBe(a.inputHash)
  })

  it("borang_e_annual: same runs + different `now` → different outputHash (regression sentinel)", () => {
    const a = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "borang_e_annual",
      [makeRun()],
      { now: FIXED_INSTANT_A }
    )
    const b = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "borang_e_annual",
      [makeRun()],
      { now: FIXED_INSTANT_B }
    )
    expect(b.outputHash).not.toBe(a.outputHash)
  })

  it("borang_e_annual: payload `generatedAt` reflects the passed `now` exactly", () => {
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "borang_e_annual",
      [makeRun()],
      { now: FIXED_INSTANT_A }
    )
    const body = result.payload.body as { generatedAt: string }
    expect(body.generatedAt).toBe(FIXED_INSTANT_A.toISOString())
  })

  it("monthly packs are unaffected by `now` (their hashed body never embedded it)", () => {
    const withA = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()],
      { now: FIXED_INSTANT_A }
    )
    const withB = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()],
      { now: FIXED_INSTANT_B }
    )
    const withoutNow = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "epf_monthly",
      [makeRun()]
    )
    expect(withB.outputHash).toBe(withA.outputHash)
    expect(withoutNow.outputHash).toBe(withA.outputHash)
  })

  it("`now` defaults to `new Date()` when omitted (back-compat with pre-3S callers)", () => {
    // Pre-3S behavior is preserved — omitting `now` still works, but EA
    // and Borang E are non-deterministic across calls. We don't assert
    // hash inequality here (would flake within the same millisecond);
    // we just prove the call succeeds and produces a well-shaped result.
    const result = buildStatutoryPackFromRuns(
      malaysia2026_01RulePack,
      "ea_annual",
      [makeRun()]
    )
    expect(result.payload.packType).toBe("ea_annual")
    const body = result.payload.body as { generatedAt: string }
    expect(body.generatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
    )
  })
})
