import { describe, expect, it } from "vitest"

import {
  CPF_ORDINARY_WAGE_CEILING_2026_01,
  CPF_V2026_01_CODE,
  computeCpfV202601,
} from "../../lib/features/hrm/data/rule-packs/singapore/cpf/v2026-01.table"
import { singapore2026_01RulePack } from "../../lib/features/hrm/data/rule-packs/singapore/sg-2026-01.rule-pack"
import {
  SDL_MAXIMUM_2026_01,
  SDL_MINIMUM_2026_01,
  SDL_V2026_01_CODE,
  computeSdlV202601,
} from "../../lib/features/hrm/data/rule-packs/singapore/sdl/v2026-01.levy"

const baseInput = {
  organizationId: "org-1",
  countryCode: "SG",
  payrollPeriodId: "p1",
  employeeId: "e1",
  monthlyGrossWages: "5000.00",
  epfMemberCategory: null,
  employeeAgeBand: "below60" as const,
  socsoCategory: null,
  eisEligible: false,
  hrdfApplicable: false,
  taxResidency: "resident" as const,
  monthNumber: 1,
  yearNumber: 2026,
  ytdRemuneration: "0",
  ytdPcbPaid: "0",
  epfEmployeeThisMonth: "1000.00",
  ytdEpfEmployee: "0",
}

describe("CPF v2026-01 — Singapore ordinary wage contribution table", () => {
  it("exports the 2026 version code and ordinary wage ceiling", () => {
    expect(CPF_V2026_01_CODE).toBe("SG-CPF-2026-01")
    expect(CPF_ORDINARY_WAGE_CEILING_2026_01).toBe(8000)
  })

  it("computes CPF for employees aged 55 and below at 20% EE / 17% ER", () => {
    expect(computeCpfV202601(5000)).toEqual({
      employeeAmount: 1000,
      employerAmount: 850,
    })
  })

  it("applies the 2026 ordinary wage ceiling for high earners", () => {
    expect(computeCpfV202601(20_000)).toEqual({
      employeeAmount: 1600,
      employerAmount: 1360,
    })
  })
})

describe("SDL v2026-01 — Singapore employer levy", () => {
  it("exports the 2026 version code and bounds", () => {
    expect(SDL_V2026_01_CODE).toBe("SG-SDL-2026-01")
    expect(SDL_MINIMUM_2026_01).toBe(2)
    expect(SDL_MAXIMUM_2026_01).toBe(11.25)
  })

  it("applies minimum, percentage, and maximum levy rules", () => {
    expect(computeSdlV202601(500)).toBe(2)
    expect(computeSdlV202601(2000)).toBe(5)
    expect(computeSdlV202601(10_000)).toBe(11.25)
  })
})

describe("Singapore SG-2026-01 contribution composition", () => {
  it("computes CPF employee contribution through the composite pack", () => {
    const ee = singapore2026_01RulePack.computeEmployeeContributions(baseInput)
    expect(ee.find((r) => r.code === "CPF_EE")?.employeeAmount).toBe("1000.00")
  })

  it("computes CPF employer contribution and SDL levy through the composite pack", () => {
    const er = singapore2026_01RulePack.computeEmployerContributions(baseInput)
    expect(er.find((r) => r.code === "CPF_ER")?.employerAmount).toBe("850.00")
    expect(er.find((r) => r.code === "SDL_ER")?.employerAmount).toBe("11.25")
  })

  it("applies ordinary wage ceiling through the composite pack", () => {
    const ee = singapore2026_01RulePack.computeEmployeeContributions({
      ...baseInput,
      monthlyGrossWages: "20000.00",
    })
    expect(ee.find((r) => r.code === "CPF_EE")?.employeeAmount).toBe(
      (8000 * 0.2).toFixed(2)
    )
  })
})
