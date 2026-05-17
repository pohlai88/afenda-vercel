import { describe, expect, it } from "vitest"

import {
  MY_STATUTORY_EXTRAS_PCB_TP1_KEY,
  MY_STATUTORY_EXTRAS_PCB_TP3_KEY,
  mergeMalaysiaPcbIntoStatutoryProfileExtras,
  parseMalaysiaPcbStatutoryExtras,
} from "../../lib/features/hrm/payroll-compensation/payroll-processing/schemas/malaysia-pcb-statutory-extras.shared"

describe("parseMalaysiaPcbStatutoryExtras", () => {
  it("returns zeros for null / invalid JSON", () => {
    expect(parseMalaysiaPcbStatutoryExtras(null)).toEqual({
      pcbTp1AdditionalReliefMonthly: "0.00",
      pcbTp3AdditionalDeductionMonthly: "0.00",
    })
  })

  it("reads canonical keys and clamps to two decimals", () => {
    const raw = {
      [MY_STATUTORY_EXTRAS_PCB_TP1_KEY]: "12.5",
      [MY_STATUTORY_EXTRAS_PCB_TP3_KEY]: "3",
      other: 1,
    }
    expect(parseMalaysiaPcbStatutoryExtras(raw)).toEqual({
      pcbTp1AdditionalReliefMonthly: "12.50",
      pcbTp3AdditionalDeductionMonthly: "3.00",
    })
  })
})

describe("mergeMalaysiaPcbIntoStatutoryProfileExtras", () => {
  it("merges TP1/TP3 and preserves unrelated keys", () => {
    const merged = mergeMalaysiaPcbIntoStatutoryProfileExtras(
      { other: "x", [MY_STATUTORY_EXTRAS_PCB_TP1_KEY]: "1" },
      {
        pcbTp1AdditionalReliefMonthlyMyr: "2.00",
        pcbTp3AdditionalDeductionMonthlyMyr: "0.50",
      }
    )
    expect(merged.other).toBe("x")
    expect(merged[MY_STATUTORY_EXTRAS_PCB_TP1_KEY]).toBe("2.00")
    expect(merged[MY_STATUTORY_EXTRAS_PCB_TP3_KEY]).toBe("0.50")
  })

  it("clears keys when patch values are empty", () => {
    const merged = mergeMalaysiaPcbIntoStatutoryProfileExtras(
      {
        [MY_STATUTORY_EXTRAS_PCB_TP1_KEY]: "9",
        [MY_STATUTORY_EXTRAS_PCB_TP3_KEY]: "1",
      },
      {
        pcbTp1AdditionalReliefMonthlyMyr: "",
        pcbTp3AdditionalDeductionMonthlyMyr: "  ",
      }
    )
    expect(merged[MY_STATUTORY_EXTRAS_PCB_TP1_KEY]).toBeUndefined()
    expect(merged[MY_STATUTORY_EXTRAS_PCB_TP3_KEY]).toBeUndefined()
  })
})
