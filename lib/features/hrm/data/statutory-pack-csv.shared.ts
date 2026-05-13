import { createHash } from "node:crypto"

import type {
  StatutoryPackPayload,
  StatutoryPackType,
} from "./payroll-rule-pack.server"

// ---------------------------------------------------------------------------
// Phase 3R — Statutory pack CSV export (operator-friendly, RFC 4180 compliant)
//
// Pure, deterministic CSV serializer for the canonical statutory pack
// payloads produced by `buildStatutoryPackFromRuns`. No I/O, no DB, no
// `server-only` — safe to unit test in isolation and re-use anywhere a
// payload object is in scope.
//
// IMPORTANT: this is the *operator* CSV — one row per employee per pack
// line, with a TOTAL footer where the payload carries totals. It is **not**
// a bureau-spec submission file (KWSP / PERKESO / LHDN have their own
// per-bureau CSV column orders and metadata blocks). Bureau-spec exporters
// will live alongside the rule-pack files in `data/rule-packs/<country>/`
// when those slices ship; today's CSV is for HR's own desk-checking,
// reconciliation, and offline review.
//
// Determinism contract (relied on by Phase 3K timeline export-event display
// and by the response hash anchor in the route handler):
//   1. Column order is fixed per pack type (no sort-by-key).
//   2. Body rows are emitted in the same order the payload's source build
//      function produced them — `buildStatutoryPackFromRuns` already sorts
//      by `employeeId`, so identical inputs yield identical bytes.
//   3. Line endings are CRLF per RFC 4180.
//   4. Cells are quoted only when they contain `,`, `"`, CR, or LF.
//   5. Internal `"` is escaped as `""`.
//   6. UTF-8 by default; no BOM (the route handler declares charset=utf-8).
// ---------------------------------------------------------------------------

const CSV_LINE_ENDING = "\r\n"
const NUMERIC_BLANK = ""

export type StatutoryPackCsvResult = {
  /** Full CSV body as a UTF-8 string (no BOM). */
  readonly csv: string
  readonly columnCount: number
  /** Total emitted body rows (excludes the header row; includes any TOTAL footer). */
  readonly rowCount: number
}

/**
 * Pure deterministic CSV serializer. Switches on `payload.packType` and
 * trusts the body shape produced by the matching `build*Pack` function.
 *
 * Throws on unknown `packType` (exhaustive switch) — callers MUST validate
 * the pack type against `STATUTORY_PACK_TYPES` before invoking.
 */
export function serializeStatutoryPackToCsv(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  switch (payload.packType) {
    case "epf_monthly":
      return serializeEpfMonthly(payload)
    case "socso_monthly":
      return serializeSocsoMonthly(payload)
    case "eis_monthly":
      return serializeEisMonthly(payload)
    case "pcb_monthly":
      return serializePcbMonthly(payload)
    case "hrdf_monthly":
      return serializeHrdfMonthly(payload)
    case "ea_annual":
      return serializeEaAnnual(payload)
    case "borang_e_annual":
      return serializeBorangEAnnual(payload)
    default: {
      const _exhaustive: never = payload.packType
      throw new Error(
        `serializeStatutoryPackToCsv: unsupported packType ${String(_exhaustive)}`
      )
    }
  }
}

// ---------------------------------------------------------------------------
// SHA-256 anchor for tamper-evident downloads
// ---------------------------------------------------------------------------

/**
 * SHA-256 hex digest of the response bytes (UTF-8). Used by the export
 * route handler to set the `X-Afenda-Pack-Hash: sha256=<hex>` response
 * header so an offline reviewer can re-hash the downloaded file and prove
 * it was not modified in transit.
 *
 * Format-agnostic: works on the canonical JSON body OR the CSV body. The
 * caller is responsible for stamping the body bytes (`new TextEncoder()`
 * is implied by `update(text, "utf8")`).
 */
export function computeStatutoryPackResponseHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

/** Header name + version prefix used by the export route. */
export const STATUTORY_PACK_HASH_HEADER = "X-Afenda-Pack-Hash"
export const STATUTORY_PACK_HASH_PREFIX = "sha256"

export function formatStatutoryPackHashHeader(hashHex: string): string {
  return `${STATUTORY_PACK_HASH_PREFIX}=${hashHex}`
}

// ---------------------------------------------------------------------------
// Filename helper (extension only — caller composes the rest)
// ---------------------------------------------------------------------------

export function statutoryPackFilename(input: {
  packType: StatutoryPackType
  countryCode: string
  periodStart: string
  format: "json" | "csv"
}): string {
  return `hrm-${input.packType}-${input.countryCode}-${input.periodStart}.${input.format}`
}

// ---------------------------------------------------------------------------
// Per-pack-type serializers
// ---------------------------------------------------------------------------

type EpfMonthlyLine = {
  employeeId: string
  employeeNumber: string
  employeeName: string
  grossWages: string
  epfEmployee: string
  epfEmployer: string
  epfTotal: string
}

type EpfMonthlyTotals = {
  epfEmployee: string
  epfEmployer: string
  epfTotal: string
  grossWages: string
}

function serializeEpfMonthly(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  const body = payload.body as {
    lines?: readonly EpfMonthlyLine[]
    totals?: Partial<EpfMonthlyTotals>
  }
  const headers = [
    "employeeId",
    "employeeNumber",
    "employeeName",
    "grossWages",
    "epfEmployee",
    "epfEmployer",
    "epfTotal",
  ] as const

  const lines = body.lines ?? []
  const rows = lines.map((line) => [
    line.employeeId,
    line.employeeNumber,
    line.employeeName,
    line.grossWages,
    line.epfEmployee,
    line.epfEmployer,
    line.epfTotal,
  ])

  const totals = body.totals ?? {}
  rows.push([
    "TOTAL",
    NUMERIC_BLANK,
    NUMERIC_BLANK,
    totals.grossWages ?? NUMERIC_BLANK,
    totals.epfEmployee ?? NUMERIC_BLANK,
    totals.epfEmployer ?? NUMERIC_BLANK,
    totals.epfTotal ?? NUMERIC_BLANK,
  ])

  return buildCsv(headers, rows)
}

type SocsoMonthlyLine = {
  employeeId: string
  employeeNumber: string
  employeeName: string
  grossWages: string
  socsoEmployee: string
  socsoEmployer: string
  socsoTotal: string
}

type SocsoMonthlyTotals = {
  socsoEmployee: string
  socsoEmployer: string
  socsoTotal: string
}

function serializeSocsoMonthly(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  const body = payload.body as {
    lines?: readonly SocsoMonthlyLine[]
    totals?: Partial<SocsoMonthlyTotals>
  }
  const headers = [
    "employeeId",
    "employeeNumber",
    "employeeName",
    "grossWages",
    "socsoEmployee",
    "socsoEmployer",
    "socsoTotal",
  ] as const

  const lines = body.lines ?? []
  const rows = lines.map((line) => [
    line.employeeId,
    line.employeeNumber,
    line.employeeName,
    line.grossWages,
    line.socsoEmployee,
    line.socsoEmployer,
    line.socsoTotal,
  ])

  const totals = body.totals ?? {}
  rows.push([
    "TOTAL",
    NUMERIC_BLANK,
    NUMERIC_BLANK,
    NUMERIC_BLANK,
    totals.socsoEmployee ?? NUMERIC_BLANK,
    totals.socsoEmployer ?? NUMERIC_BLANK,
    totals.socsoTotal ?? NUMERIC_BLANK,
  ])

  return buildCsv(headers, rows)
}

type EisMonthlyLine = {
  employeeId: string
  employeeNumber: string
  employeeName: string
  grossWages: string
  eisEmployee: string
  eisEmployer: string
  eisTotal: string
}

type EisMonthlyTotals = {
  eisEmployee: string
  eisEmployer: string
  eisTotal: string
}

function serializeEisMonthly(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  const body = payload.body as {
    lines?: readonly EisMonthlyLine[]
    totals?: Partial<EisMonthlyTotals>
  }
  const headers = [
    "employeeId",
    "employeeNumber",
    "employeeName",
    "grossWages",
    "eisEmployee",
    "eisEmployer",
    "eisTotal",
  ] as const

  const lines = body.lines ?? []
  const rows = lines.map((line) => [
    line.employeeId,
    line.employeeNumber,
    line.employeeName,
    line.grossWages,
    line.eisEmployee,
    line.eisEmployer,
    line.eisTotal,
  ])

  const totals = body.totals ?? {}
  rows.push([
    "TOTAL",
    NUMERIC_BLANK,
    NUMERIC_BLANK,
    NUMERIC_BLANK,
    totals.eisEmployee ?? NUMERIC_BLANK,
    totals.eisEmployer ?? NUMERIC_BLANK,
    totals.eisTotal ?? NUMERIC_BLANK,
  ])

  return buildCsv(headers, rows)
}

type PcbMonthlyLine = {
  employeeId: string
  employeeNumber: string
  employeeName: string
  grossWages: string
  pcb: string
}

type PcbMonthlyTotals = {
  pcb: string
  grossWages: string
}

function serializePcbMonthly(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  const body = payload.body as {
    lines?: readonly PcbMonthlyLine[]
    totals?: Partial<PcbMonthlyTotals>
  }
  const headers = [
    "employeeId",
    "employeeNumber",
    "employeeName",
    "grossWages",
    "pcb",
  ] as const

  const lines = body.lines ?? []
  const rows = lines.map((line) => [
    line.employeeId,
    line.employeeNumber,
    line.employeeName,
    line.grossWages,
    line.pcb,
  ])

  const totals = body.totals ?? {}
  rows.push([
    "TOTAL",
    NUMERIC_BLANK,
    NUMERIC_BLANK,
    totals.grossWages ?? NUMERIC_BLANK,
    totals.pcb ?? NUMERIC_BLANK,
  ])

  return buildCsv(headers, rows)
}

type HrdfMonthlyLine = {
  employeeId: string
  employeeNumber: string
  employeeName: string
  grossWages: string
  levy?: string
  sdl?: string
}

type HrdfMonthlyTotals = {
  levy?: string
  sdl?: string
  grossWages: string
}

function serializeHrdfMonthly(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  const body = payload.body as {
    lines?: readonly HrdfMonthlyLine[]
    totals?: Partial<HrdfMonthlyTotals>
  }
  const headers = [
    "employeeId",
    "employeeNumber",
    "employeeName",
    "grossWages",
    "levy",
  ] as const

  const lines = body.lines ?? []
  const rows = lines.map((line) => [
    line.employeeId,
    line.employeeNumber,
    line.employeeName,
    line.grossWages,
    line.levy ?? line.sdl ?? NUMERIC_BLANK,
  ])

  const totals = body.totals ?? {}
  rows.push([
    "TOTAL",
    NUMERIC_BLANK,
    NUMERIC_BLANK,
    totals.grossWages ?? NUMERIC_BLANK,
    totals.levy ?? totals.sdl ?? NUMERIC_BLANK,
  ])

  return buildCsv(headers, rows)
}

type EaAnnualEmployee = {
  employeeId: string
  employeeNumber: string
  employeeName: string
  grossIncome: string
  epfEmployee: string
  socsoEmployee: string
  eisEmployee: string
  incomeTaxPaid: string
  taxableIncome: string
}

function serializeEaAnnual(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  const body = payload.body as { employees?: readonly EaAnnualEmployee[] }
  const headers = [
    "employeeId",
    "employeeNumber",
    "employeeName",
    "grossIncome",
    "epfEmployee",
    "socsoEmployee",
    "eisEmployee",
    "incomeTaxPaid",
    "taxableIncome",
  ] as const

  const employees = body.employees ?? []
  const rows = employees.map((employee) => [
    employee.employeeId,
    employee.employeeNumber,
    employee.employeeName,
    employee.grossIncome,
    employee.epfEmployee,
    employee.socsoEmployee,
    employee.eisEmployee,
    employee.incomeTaxPaid,
    employee.taxableIncome,
  ])

  return buildCsv(headers, rows)
}

function serializeBorangEAnnual(
  payload: StatutoryPackPayload
): StatutoryPackCsvResult {
  const body = payload.body as {
    year?: string
    countryCode?: string
    employeeCount?: number
    totalGrossRemuneration?: string
    totalIncomeTaxDeducted?: string
  }
  const headers = ["metric", "value"] as const

  const rows: ReadonlyArray<readonly [string, string]> = [
    ["year", body.year ?? ""],
    ["countryCode", body.countryCode ?? ""],
    ["employeeCount", body.employeeCount?.toString() ?? "0"],
    ["totalGrossRemuneration", body.totalGrossRemuneration ?? ""],
    ["totalIncomeTaxDeducted", body.totalIncomeTaxDeducted ?? ""],
  ]

  return buildCsv(headers, rows)
}

// ---------------------------------------------------------------------------
// CSV primitives (RFC 4180)
// ---------------------------------------------------------------------------

function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): StatutoryPackCsvResult {
  const lines: string[] = [headers.map(escapeCsvCell).join(",")]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","))
  }
  return {
    csv: lines.join(CSV_LINE_ENDING) + CSV_LINE_ENDING,
    columnCount: headers.length,
    rowCount: rows.length,
  }
}

/**
 * RFC 4180 §2.6 — fields containing line breaks (CRLF), double quotes, or
 * commas should be enclosed in double-quotes; an embedded double-quote is
 * escaped by preceding it with another double-quote.
 *
 * Numeric cells (e.g. "0.00") and identifier cells (e.g. "MY-00042") flow
 * through unquoted, which matches what every spreadsheet expects.
 */
function escapeCsvCell(value: string): string {
  if (value === "") return ""
  const needsQuoting =
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\r") ||
    value.includes("\n")
  if (!needsQuoting) {
    return value
  }
  return `"${value.replace(/"/g, '""')}"`
}
