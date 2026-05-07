/**
 * Tiny dependency-free CSV parser used by the ingestion-job pipeline.
 *
 * Supports the RFC-4180 subset used by spreadsheet exports:
 *   - comma separators
 *   - quoted fields with `""` escaping
 *   - CR / LF / CRLF line endings (any combo)
 *   - empty trailing rows are dropped
 *
 * Returns deterministic, predictable shapes so adapters never need to know
 * about CSV quirks.
 */

export type CsvParseOk = {
  ok: true
  /** Lower-cased / trimmed header column names. */
  headers: readonly string[]
  /** Rows keyed by header (missing columns map to ""). */
  rows: ReadonlyArray<Readonly<Record<string, string>>>
}

export type CsvParseErr = {
  ok: false
  error: string
  rowIndex?: number
}

export type CsvParseResult = CsvParseOk | CsvParseErr

const QUOTE = '"'
const COMMA = ","

/**
 * Parses the entire CSV body. The first non-empty line is treated as the
 * header row and used to key subsequent records.
 */
export function parseCsv(input: string): CsvParseResult {
  const records = tokenize(input)
  if (records.length === 0) {
    return { ok: false, error: "CSV is empty" }
  }
  const [rawHeaders, ...rest] = records
  const headers = rawHeaders.map((cell) => cell.trim().toLowerCase())
  if (headers.length === 0 || headers.every((h) => h.length === 0)) {
    return { ok: false, error: "CSV header row is empty" }
  }

  const rows: Record<string, string>[] = []
  for (let i = 0; i < rest.length; i++) {
    const cells = rest[i]
    if (cells.length === 1 && cells[0].trim().length === 0) continue
    const record: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = (cells[j] ?? "").trim()
    }
    rows.push(record)
  }

  return { ok: true, headers, rows }
}

function tokenize(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    row.push(cell)
    cell = ""
  }
  const pushRow = () => {
    rows.push(row)
    row = []
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (inQuotes) {
      if (ch === QUOTE) {
        if (input[i + 1] === QUOTE) {
          cell += QUOTE
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }

    if (ch === QUOTE) {
      inQuotes = true
      continue
    }
    if (ch === COMMA) {
      pushCell()
      continue
    }
    if (ch === "\r") {
      if (input[i + 1] === "\n") i++
      pushCell()
      pushRow()
      continue
    }
    if (ch === "\n") {
      pushCell()
      pushRow()
      continue
    }
    cell += ch
  }
  pushCell()
  if (row.length > 0 && !(row.length === 1 && row[0].length === 0)) {
    pushRow()
  }
  return rows
}

/** sha-256 hex digest of the canonical CSV body for idempotency. */
export async function digestCsv(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest("SHA-256", data)
  const view = new Uint8Array(buf)
  let out = ""
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, "0")
  }
  return out
}
