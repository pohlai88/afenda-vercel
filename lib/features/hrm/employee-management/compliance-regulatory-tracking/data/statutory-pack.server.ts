import "server-only"

import { createHash } from "node:crypto"

import type {
  PayrollRulePack,
  StatutoryPackPayload,
  StatutoryPackType,
} from "../../../payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server"

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
 *
 * Determinism contract — the **only** non-deterministic input is `now`,
 * which historically defaulted to `new Date()` and was embedded in the
 * EA / Borang E payload `generatedAt` field. That made re-derivation hash
 * verification (export, retry, re-submit) fail with `evidence_drift` for
 * those two annual packs because the rebuilt `outputHash` could never
 * match the stored one.
 *
 * Callers MUST now pass `now` explicitly:
 *   - **Producer side** (first-time generation): pass `new Date()` here
 *     **and** the same instant to `upsertComplianceEvidenceMutation` via
 *     `generatedAt`, so the stored row anchors the exact instant the
 *     hashed body captures.
 *   - **Receiver side** (export / retry / re-submit): pass
 *     `evidence.generatedAt` so the rebuilt body reproduces the original
 *     bytes and `outputHash` matches.
 *
 * `now` defaults to `new Date()` for back-compat. Pack types whose body
 * does not embed `now` (`epf_monthly`, `socso_monthly`, `eis_monthly`,
 * `pcb_monthly`) are unaffected — their hashes were already deterministic.
 */
export function buildStatutoryPackFromRuns(
  rulePack: PayrollRulePack,
  packType: StatutoryPackType,
  runs: readonly StatutoryPackRunInput[],
  options?: { readonly now?: Date }
): StatutoryPackResult {
  const period = runs[0]?.periodStart.slice(0, 7) ?? "unknown"
  const now = options?.now ?? new Date()

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
    case "hrdf_monthly":
      payload = buildHrdfMonthlyPack(rulePack, runs, period)
      break
    case "ea_annual":
      payload = buildEaAnnualPack(rulePack, runs, period, now)
      break
    case "borang_e_annual":
      payload = buildBorangEPack(rulePack, runs, period, now)
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
  if (rulePack.countryCode === "SG") {
    return buildSingaporeCpfMonthlyPack(rulePack, runs, period)
  }

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
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "KWSP",
      contributionScheme: "EPF_THIRD_SCHEDULE",
      lines,
      totals,
    },
  }
}

function buildSingaporeCpfMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => {
      const cpfEe = findLineAmount(r.lines, "CPF_EE")
      const cpfEr = findLineAmount(r.lines, "CPF_ER")
      return {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        ordinaryWages: r.grossPay,
        cpfEmployee: cpfEe,
        cpfEmployer: cpfEr,
        cpfTotal: addAmounts(cpfEe, cpfEr),
      }
    })

  const totals = {
    cpfEmployee: sumColumn(lines, "cpfEmployee"),
    cpfEmployer: sumColumn(lines, "cpfEmployer"),
    cpfTotal: sumColumn(lines, "cpfTotal"),
    ordinaryWages: sumColumn(lines, "ordinaryWages"),
  }

  return {
    packType: "epf_monthly",
    formatVersion: rulePack.manifest.epfVersion,
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "CPF_BOARD",
      contributionScheme: "CPF_ORDINARY_WAGES",
      lines,
      totals,
    },
  }
}

function buildSocsoMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  if (rulePack.countryCode === "SG") {
    return buildNotApplicablePack(rulePack, "socso_monthly", period)
  }

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
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "PERKESO",
      scheme: "SOCSO",
      lines,
      totals,
    },
  }
}

function buildEisMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  if (rulePack.countryCode === "SG") {
    return buildNotApplicablePack(rulePack, "eis_monthly", period)
  }

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
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "PERKESO",
      scheme: "EIS",
      lines,
      totals,
    },
  }
}

function buildPcbMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  if (rulePack.countryCode === "SG") {
    return buildSingaporeIrasNoMonthlyWithholdingPack(rulePack, runs, period)
  }

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
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "LHDN",
      mtdComputerisedVersion: rulePack.manifest.pcbVersion,
      lines,
      totals,
    },
  }
}

function buildHrdfMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  if (rulePack.countryCode === "SG") {
    return buildSingaporeSdlMonthlyPack(rulePack, runs, period)
  }

  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => {
      const levy = findLineAmount(r.lines, "HRDF")
      return {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        grossWages: r.grossPay,
        levy,
      }
    })

  const totals = {
    levy: sumColumn(lines, "levy"),
    grossWages: sumColumn(lines, "grossWages"),
  }

  return {
    packType: "hrdf_monthly",
    formatVersion: rulePack.manifest.hrdfVersion ?? "N-A",
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "HRD_CORP",
      lines,
      totals,
    },
  }
}

function buildSingaporeSdlMonthlyPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => {
      const sdl = findLineAmount(r.lines, "SDL_ER")
      return {
        employeeId: r.employeeId,
        employeeNumber: r.employeeNumber,
        employeeName: r.employeeName,
        grossWages: r.grossPay,
        sdl,
      }
    })

  const totals = {
    sdl: sumColumn(lines, "sdl"),
    grossWages: sumColumn(lines, "grossWages"),
  }

  return {
    packType: "hrdf_monthly",
    formatVersion: rulePack.manifest.hrdfVersion ?? "SG-SDL-UNKNOWN",
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "SKILLSFUTURE_SINGAPORE",
      levyScheme: "SDL",
      lines,
      totals,
    },
  }
}

function buildSingaporeIrasNoMonthlyWithholdingPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string
): StatutoryPackPayload {
  const lines = [...runs]
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId))
    .map((r) => ({
      employeeId: r.employeeId,
      employeeNumber: r.employeeNumber,
      employeeName: r.employeeName,
      grossWages: r.grossPay,
      withholding: "0.00",
    }))

  return {
    packType: "pcb_monthly",
    formatVersion: rulePack.manifest.pcbVersion,
    body: {
      period,
      countryCode: rulePack.countryCode,
      authority: "IRAS",
      status: "no_monthly_withholding",
      lines,
      totals: {
        withholding: "0.00",
        grossWages: sumColumn(lines, "grossWages"),
      },
    },
  }
}

function buildEaAnnualPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string,
  now: Date
): StatutoryPackPayload {
  if (rulePack.countryCode === "SG") {
    return buildNotApplicablePack(rulePack, "ea_annual", period, now)
  }

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
      authority: "LHDN",
      formReference: "Form EA (Section 83, Income Tax Act 1967)",
      schemaHint: "internal_aggregate_only",
      employees,
      generatedAt: now.toISOString(),
    },
  }
}

function buildBorangEPack(
  rulePack: PayrollRulePack,
  runs: readonly StatutoryPackRunInput[],
  period: string,
  now: Date
): StatutoryPackPayload {
  if (rulePack.countryCode === "SG") {
    return buildNotApplicablePack(rulePack, "borang_e_annual", period, now)
  }

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
      authority: "LHDN",
      formReference: "CP8D / Borang E (Monthly Tax Deduction annual return)",
      schemaHint: "internal_aggregate_only",
      employeeCount,
      totalGrossRemuneration: fmt2(totalGross),
      totalIncomeTaxDeducted: fmt2(totalPcb),
      generatedAt: now.toISOString(),
    },
  }
}

function buildNotApplicablePack(
  rulePack: PayrollRulePack,
  packType: StatutoryPackType,
  period: string,
  now?: Date
): StatutoryPackPayload {
  return {
    packType,
    formatVersion: formatVersionForPackType(rulePack, packType),
    body: {
      period,
      countryCode: rulePack.countryCode,
      status: "not_applicable",
      generatedAt: now?.toISOString(),
      issues: [
        {
          code: "STATUTORY_PACK_NOT_APPLICABLE",
          message: `${packType} is not applicable for ${rulePack.countryCode}.`,
        },
      ],
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

function formatVersionForPackType(
  rulePack: PayrollRulePack,
  packType: StatutoryPackType
): string {
  switch (packType) {
    case "epf_monthly":
      return rulePack.manifest.epfVersion
    case "socso_monthly":
      return rulePack.manifest.socsoVersion
    case "eis_monthly":
      return rulePack.manifest.eisVersion
    case "pcb_monthly":
      return rulePack.manifest.pcbVersion
    case "hrdf_monthly":
      return rulePack.manifest.hrdfVersion ?? "N-A"
    case "ea_annual":
      return rulePack.manifest.eaLeaveVersion
    case "borang_e_annual":
      return rulePack.manifest.pcbVersion
    default: {
      const _exhaustive: never = packType
      return _exhaustive
    }
  }
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
