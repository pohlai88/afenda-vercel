import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buildStatutoryPackFromRuns } from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/statutory-pack.server.ts"
import type { StatutoryPackRunInput } from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/statutory-pack.server.ts"
import { singapore2026_01RulePack } from "../../lib/features/hrm/payroll-compensation/multi-country-payroll/data/rule-packs/singapore/sg-2026-01.rule-pack.ts"

function makeSgRun(
  overrides?: Partial<StatutoryPackRunInput>
): StatutoryPackRunInput {
  return {
    runId: "sg-run-001",
    employeeId: "sg-emp-001",
    employeeNumber: "SG-00001",
    employeeName: "Tan Mei Lin",
    periodId: "sg-period-2026-01",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    grossPay: "8000.00",
    netPay: "6400.00",
    lines: [
      { lineKind: "earning", code: "BASIC", amount: "8000.00" },
      { lineKind: "employee_deduction", code: "CPF_EE", amount: "-1600.00" },
      { lineKind: "employer_contribution", code: "CPF_ER", amount: "1360.00" },
      { lineKind: "employer_contribution", code: "SDL_ER", amount: "11.25" },
    ],
    ...overrides,
  }
}

function makeLowWageSgRun(): StatutoryPackRunInput {
  return makeSgRun({
    runId: "sg-run-002",
    employeeId: "sg-emp-002",
    employeeNumber: "SG-00002",
    employeeName: "Raj Kumar",
    grossPay: "1000.00",
    netPay: "800.00",
    lines: [
      { lineKind: "earning", code: "BASIC", amount: "1000.00" },
      { lineKind: "employee_deduction", code: "CPF_EE", amount: "-200.00" },
      { lineKind: "employer_contribution", code: "CPF_ER", amount: "170.00" },
      { lineKind: "employer_contribution", code: "SDL_ER", amount: "2.00" },
    ],
  })
}

describe("Singapore statutory packs", () => {
  it("exposes CPF, SDL, and IRAS no-withholding packs by default", () => {
    expect(singapore2026_01RulePack.defaultStatutoryPackTypes()).toEqual([
      "epf_monthly",
      "hrdf_monthly",
      "pcb_monthly",
    ])
  })

  it("builds a CPF monthly payload from SG CPF lines", () => {
    const result = buildStatutoryPackFromRuns(
      singapore2026_01RulePack,
      "epf_monthly",
      [makeSgRun(), makeLowWageSgRun()]
    )

    expect(result.payload.packType).toBe("epf_monthly")
    expect(result.payload.formatVersion).toBe("SG-CPF-2026-01")

    const body = result.payload.body as {
      authority: string
      contributionScheme: string
      lines: Array<{
        cpfEmployee: string
        cpfEmployer: string
        cpfTotal: string
        ordinaryWages: string
      }>
      totals: Record<string, string>
    }
    expect(body.authority).toBe("CPF_BOARD")
    expect(body.contributionScheme).toBe("CPF_ORDINARY_WAGES")
    expect(body.lines).toHaveLength(2)
    expect(body.lines[0]).toMatchObject({
      ordinaryWages: "8000.00",
      cpfEmployee: "1600.00",
      cpfEmployer: "1360.00",
      cpfTotal: "2960.00",
    })
    expect(body.totals).toMatchObject({
      ordinaryWages: "9000.00",
      cpfEmployee: "1800.00",
      cpfEmployer: "1530.00",
      cpfTotal: "3330.00",
    })
  })

  it("builds an SDL monthly payload from SG SDL lines", () => {
    const result = buildStatutoryPackFromRuns(
      singapore2026_01RulePack,
      "hrdf_monthly",
      [makeSgRun(), makeLowWageSgRun()]
    )

    expect(result.payload.packType).toBe("hrdf_monthly")
    expect(result.payload.formatVersion).toBe("SG-SDL-2026-01")

    const body = result.payload.body as {
      authority: string
      levyScheme: string
      lines: Array<{ sdl: string; grossWages: string }>
      totals: Record<string, string>
    }
    expect(body.authority).toBe("SKILLSFUTURE_SINGAPORE")
    expect(body.levyScheme).toBe("SDL")
    expect(body.lines.map((line) => line.sdl)).toEqual(["11.25", "2.00"])
    expect(body.totals).toMatchObject({
      grossWages: "9000.00",
      sdl: "13.25",
    })
  })

  it("builds an IRAS monthly no-withholding evidence payload", () => {
    const result = buildStatutoryPackFromRuns(
      singapore2026_01RulePack,
      "pcb_monthly",
      [makeSgRun(), makeLowWageSgRun()]
    )

    expect(result.payload.packType).toBe("pcb_monthly")
    expect(result.payload.formatVersion).toBe(
      "SG-IRAS-NO-MONTHLY-WITHHOLDING-2026-01"
    )

    const body = result.payload.body as {
      authority: string
      status: string
      lines: Array<{ withholding: string }>
      totals: Record<string, string>
    }
    expect(body.authority).toBe("IRAS")
    expect(body.status).toBe("no_monthly_withholding")
    expect(body.lines.map((line) => line.withholding)).toEqual(["0.00", "0.00"])
    expect(body.totals).toMatchObject({
      grossWages: "9000.00",
      withholding: "0.00",
    })
  })

  it("keeps SG pack hashes deterministic and order-independent", () => {
    const high = makeSgRun()
    const low = makeLowWageSgRun()
    const first = buildStatutoryPackFromRuns(
      singapore2026_01RulePack,
      "hrdf_monthly",
      [high, low]
    )
    const second = buildStatutoryPackFromRuns(
      singapore2026_01RulePack,
      "hrdf_monthly",
      [low, high]
    )

    expect(first.inputHash).toBe(second.inputHash)
    expect(first.outputHash).toBe(second.outputHash)
  })

  it("returns explicit not-applicable evidence for SG SOCSO/EIS style packs", () => {
    const result = buildStatutoryPackFromRuns(
      singapore2026_01RulePack,
      "socso_monthly",
      [makeSgRun()]
    )

    expect(result.payload.formatVersion).toBe("SG-N-A")
    expect(result.payload.body).toMatchObject({
      countryCode: "SG",
      status: "not_applicable",
      issues: [
        {
          code: "STATUTORY_PACK_NOT_APPLICABLE",
        },
      ],
    })
  })
})
