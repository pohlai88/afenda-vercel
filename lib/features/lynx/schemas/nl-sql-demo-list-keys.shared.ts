import type { LynxNlDemoResultRow } from "./nl-sql-demo.schema"

const SEP = "\u001f"

/**
 * Stable React keys for NL→SQL demo result rows (no DB id — fingerprint column
 * values in catalog order; suffix duplicate occurrences).
 */
export function stableNlDemoResultRowKeys(
  rows: LynxNlDemoResultRow[],
  columns: readonly string[]
): string[] {
  const seen = new Map<string, number>()
  return rows.map((row) => {
    const fp = columns.map((col) => `${col}${SEP}${String(row[col] ?? "")}`).join(SEP)
    const n = seen.get(fp) ?? 0
    seen.set(fp, n + 1)
    return n === 0 ? fp : `${fp}${SEP}dup${n}`
  })
}

type ExplainRow = { section: string; explanation: string }

/** Stable keys for SQL explanation bullets (duplicate section+body disambiguated). */
export function stableNlDemoExplanationKeys(rows: ExplainRow[]): string[] {
  const seen = new Map<string, number>()
  return rows.map((row) => {
    const fp = `${row.section}${SEP}${row.explanation}`
    const n = seen.get(fp) ?? 0
    seen.set(fp, n + 1)
    return n === 0 ? fp : `${fp}${SEP}dup${n}`
  })
}
