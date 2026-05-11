import "server-only"

import { createHash } from "node:crypto"

import type {
  PayrollRulePack,
  StatutoryPackPayload,
  StatutoryPackType,
} from "./payroll-rule-pack.server"

// ---------------------------------------------------------------------------
// Input contracts (pre-fetched by the action — no DB in here)
// ---------------------------------------------------------------------------

/**
 * One payroll run with all its lines, pre-fetched for pack building.
 * The action queries DB then passes these to buildStatutoryPack.
 */
export type StatutoryPackRunInput = {
  readonly runId: string
  readonly employeeId: string
  /** Employee's external identifier, e.g. "MY-00042". */
  readonly employeeNumber: string
  readonly employeeName: string
  readonly periodId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly grossPay: string
  readonly netPay: string
  readonly lines: readonly StatutoryPackLineInput[]
}

export type StatutoryPackLineInput = {
  readonly lineKind:
    | "earning"
    | "employee_deduction"
    | "employer_contribution"
    | "tax"
  readonly code: string
  readonly amount: string
  readonly rulePackProvenance?: Readonly<Record<string, string | null>>
}

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export type StatutoryPackResult = {
  readonly payload: StatutoryPackPayload
  /** SHA-256 hex of the canonical input representation. */
  readonly inputHash: string
  /** SHA-256 hex of the JSON-serialized payload body. */
  readonly outputHash: string
}

// ---------------------------------------------------------------------------
// Core builder
// ---------------------------------------------------------------------------

/**
 * Pure deterministic statutory pack builder.
 * Takes a resolved PayrollRulePack + pre-fetched run data.
 * No DB, no IO — fully unit-testable and idempotent.
 */
export function buildStatutoryPackFromRuns(
  rulePack: PayrollRulePack,
  packType: StatutoryPackType,
  runs: readonly StatutoryPackRunInput[]
): StatutoryPackResult {
  const period = runs[0]?.periodStart.slice(0, 7) ?? "unknown"

  let payload: StatutoryPackPayload

  switch (packType) {
    case "epf_monthly":
      payload = buildEpfMonthlyPack(rulePack, runs, period)
      break
    case "socso_monthly":
      payload = buildSocsoMonthlyPack(rulePack, runs, period)
      break
    case "eis_monthly":
      payload = buildEisMonthlyPack(rulePack, runs, period)
      break
    case "pcb_monthly":
      payload = buildPcbMonthlyPack(rulePack, runs, period)
      break
    case "ea_annual":
      payload = buildEaAnnualPack(rulePack, runs, period)
      break
    case "borang_e_annual":
      payload = buildBorangEPack(rulePack, runs, period)
      break
    default: {
      const _exhaustive: never = packType
      throw new Error(`Unknown packType: ${_exhaustive}`)
    }
  }

  const inputCanonical = canonicalInputString(packType, runs)
  const outputCanonical = JSON.stringify(payload)

  return {
    payload,
    inputHash: sha256(inputCanonical),
    outputHash: sha256(outputCanonical),
  }
}

// ---------------------------------------------------------------------------
// Per-pack-type builders
// ---------------------------------------------------------------------------

function buildEpfMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => {
      const epfEe = findLineAmount(r.lines, "EPF_EE")
      const epfEr = findLineAmount(r.lines, "EPF_ER")
      return {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        grossWages: r.grossPay,
        epfEmployee: epfEe,
        epfEmployer: epfEr,
        epfTotal: addAmounts(epfEe, epfEr),
      }
    })

  const totals = {
    epfEmployee: sumColumn(lines, "epfEmployee"),
    epfEmployer: sumColumn(lines, "epfEmployer"),
    epfTotal: sumColumn(lines, "epfTotal"),
    grossWages: sumColumn(lines, "grossWages"),
  }

  return {
    packType: "epf_monthly",
    formatVersion: rulePack.manifest.epfVersion,
    body: { period, countryCode: rulePack.countryCode, lines, totals },
  }
}

function buildSocsoMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => {
      const socsoEe = findLineAmount(r.lines, "SOCSO_EE")
      const socsoEr = findLineAmount(r.lines, "SOCSO_ER")
      return {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        grossWages: r.grossPay,
        socsoEmployee: socsoEe,
        socsoEmployer: socsoEr,
        socsoTotal: addAmounts(socsoEe, socsoEr),
      }
    })

  const totals = {
    socsoEmployee: sumColumn(lines, "socsoEmployee"),
    socsoEmployer: sumColumn(lines, "socsoEmployer"),
    socsoTotal: sumColumn(lines, "socsoTotal"),
  }

  return {
    packType: "socso_monthly",
    formatVersion: rulePack.manifest.socsoVersion,
    body: { period, countryCode: rulePack.countryCode, lines, totals },
  }
}

function buildEisMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => {
      const eisEe = findLineAmount(r.lines, "EIS_EE")
      const eisEr = findLineAmount(r.lines, "EIS_ER")
      return {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        grossWages: r.grossPay,
        eisEmployee: eisEe,
        eisEmployer: eisEr,
        eisTotal: addAmounts(eisEe, eisEr),
      }
    })

  const totals = {
    eisEmployee: sumColumn(lines, "eisEmployee"),
    eisEmployer: sumColumn(lines, "eisEmployer"),
    eisTotal: sumColumn(lines, "eisTotal"),
  }

  return {
    packType: "eis_monthly",
    formatVersion: rulePack.manifest.eisVersion,
    body: { period, countryCode: rulePack.countryCode, lines, totals },
  }
}

function buildPcbMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => {
      const pcbAmount = findLineAmount(r.lines, "PCB")
      return {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        grossWages: r.grossPay,
        pcb: pcbAmount,
      }
    })

  const totals = {
    pcb: sumColumn(lines, "pcb"),
    grossWages: sumColumn(lines, "grossWages"),
  }

  return {
    packType: "pcb_monthly",
    formatVersion: rulePack.manifest.pcbVersion,
    body: { period, countryCode: rulePack.countryCode, lines, totals },
  }
}

function buildEaAnnualPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const year = period.slice(0, 4)

  // Group runs by employee — for EA annual we need yearly totals
  const byEmployee = new Map<
    string,
    {
      employeeId: string
      employeeNumber: string
      employeeName: string
      totalGross: number
      totalEpfEe: number
      totalSocsoEe: number
      totalEisEe: number
      totalPcb: number
    }
  >()

  for (const r of runs) {
    const existing = byEmployee.get(r.employeeId)
    const gross = parseFloat(r.grossPay) || 0
    const epfEe = parseFloat(findLineAmount(r.lines, "EPF_EE")) || 0
    const socsoEe = parseFloat(findLineAmount(r.lines, "SOCSO_EE")) || 0
    const eisEe = parseFloat(findLineAmount(r.lines, "EIS_EE")) || 0
    const pcb = parseFloat(findLineAmount(r.lines, "PCB")) || 0

    if (existing) {
      existing.totalGross += gross
      existing.totalEpfEe += epfEe
      existing.totalSocsoEe += socsoEe
      existing.totalEisEe += eisEe
      existing.totalPcb += pcb
    } else {
      byEmployee.set(r.employeeId, {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        totalGross: gross,
        totalEpfEe: epfEe,
        totalSocsoEe: socsoEe,
        totalEisEe: eisEe,
        totalPcb: pcb,
      })
    }
  }

  const employees = Array.from(byEmployee.values())
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((e) => ({
      employeeId: e.employeeId,
      employeeNumber: e.employeeNumber,
      employeeName: e.employeeName,
      grossIncome: fmt2(e.totalGross),
      epfEmployee: fmt2(e.totalEpfEe),
      socsoEmployee: fmt2(e.totalSocsoEe),
      eisEmployee: fmt2(e.totalEisEe),
      incomeTaxPaid: fmt2(e.totalPcb),
      taxableIncome: fmt2(Math.max(0, e.totalGross - e.totalEpfEe)),
    }))

  return {
    packType: "ea_annual",
    formatVersion: rulePack.manifest.eaLeaveVersion,
    body: {
      year,
      countryCode: rulePack.countryCode,
      employees,
      generatedAt: new Date().toISOString(),
    },
  }
}

function buildBorangEPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const year = period.slice(0, 4)
  const totalGross = runs.reduce((s, r) => s + (parseFloat(r.grossPay) || 0), 0)
  const totalPcb = runs.reduce(
    (s, r) => s + (parseFloat(findLineAmount(r.lines, "PCB")) || 0),
    0
  )
  const employeeCount = new Set(runs.map((r) => r.employeeId)).size

  return {
    packType: "borang_e_annual",
    formatVersion: rulePack.manifest.pcbVersion,
    body: {
      year,
      countryCode: rulePack.countryCode,
      employeeCount,
      totalGrossRemuneration: fmt2(totalGross),
      totalIncomeTaxDeducted: fmt2(totalPcb),
      generatedAt: new Date().toISOString(),
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findLineAmount(
  lines: readonly StatutoryPackLineInput[],
  code: string
): string {
  const line = lines.find((l) => l.code === code)
  if (!line) return "0.00"
  // Deduction lines are stored negative; return absolute value
  const v = parseFloat(line.amount)
  return fmt2(Math.abs(v))
}

function addAmounts(a: string, b: string): string {
  return fmt2((parseFloat(a) || 0) + (parseFloat(b) || 0))
}

function sumColumn(
  rows: readonly Record<string, string>[],
  col: string
): string {
  return fmt2(rows.reduce((s, r) => s + (parseFloat(r[col] ?? "0") || 0), 0))
}

function fmt2(n: number): string {
  return n.toFixed(2)
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex")
}

/**
 * Canonical deterministic string for input hashing.
 * Sorted by runId so identical inputs always produce the same hash.
 */
function canonicalInputString(
  packType: StatutoryPackType,
  runs: readonly StatutoryPackRunInput[]
): string {
  const sorted = [...runs].sort((a, b) => a.runId.localeCompare(b.runId))
  return JSON.stringify({
    packType,
    runs: sorted.map((r) => ({
      runId: r.runId,
      employeeId: r.employeeId,
      grossPay: r.grossPay,
      lines: [...r.lines]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((l) => ({ code: l.code, amount: l.amount })),
    })),
  })
}
