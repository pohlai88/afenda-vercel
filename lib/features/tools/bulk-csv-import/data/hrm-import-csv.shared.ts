/**
 * Pure CSV parsing + dry-run validation for HRM bulk import (shared by route
 * handler and Server Actions).
 */

export type HrmImportRowErr = { line: number; message: string }

export function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  return lines.map((line) => {
    const cells: string[] = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQuotes = !inQuotes
      } else if (c === "," && !inQuotes) {
        cells.push(cur.trim())
        cur = ""
      } else {
        cur += c
      }
    }
    cells.push(cur.trim())
    return cells
  })
}

export function dryRunEmployees(rows: string[][]): {
  rowCount: number
  errors: HrmImportRowErr[]
} {
  const errors: HrmImportRowErr[] = []
  if (rows.length < 2) {
    errors.push({
      line: 1,
      message: "CSV must include a header row and at least one data row.",
    })
    return { rowCount: 0, errors }
  }
  const header = rows[0].map((h) => h.toLowerCase())
  const idxNum = header.indexOf("employee_number")
  const idxName = header.indexOf("display_name")
  if (idxNum < 0 || idxName < 0) {
    errors.push({
      line: 1,
      message: "Missing required headers: employee_number, display_name",
    })
    return { rowCount: 0, errors }
  }
  let dataRows = 0
  const seenEmployeeNumbers = new Map<string, number>()
  for (let i = 1; i < rows.length; i++) {
    const lineNo = i + 1
    const r = rows[i]
    const num = r[idxNum]?.trim()
    const name = r[idxName]?.trim()
    if (!num)
      errors.push({ line: lineNo, message: "employee_number is required" })
    if (!name)
      errors.push({ line: lineNo, message: "display_name is required" })
    if (num && num.length > 64) {
      errors.push({
        line: lineNo,
        message: "employee_number too long (max 64)",
      })
    }
    if (name && name.length > 200) {
      errors.push({ line: lineNo, message: "display_name too long (max 200)" })
    }
    if (num && num.length <= 64) {
      const firstLine = seenEmployeeNumbers.get(num)
      if (firstLine !== undefined) {
        errors.push({
          line: lineNo,
          message: `Duplicate employee_number (first on line ${firstLine})`,
        })
      } else {
        seenEmployeeNumbers.set(num, lineNo)
      }
    }
    if (num && name && num.length <= 64 && name.length <= 200) {
      const firstLine = seenEmployeeNumbers.get(num)
      if (firstLine === lineNo) {
        dataRows += 1
      }
    }
  }
  return { rowCount: dataRows, errors }
}

export type HrmEmployeeImportRow = {
  readonly employeeNumber: string
  readonly legalName: string
}

/**
 * Returns parsed employee rows after the same validation as {@link dryRunEmployees}.
 * Caller must ensure `dryRunEmployees` returned no errors and `rowCount > 0`.
 */
export function listValidEmployeeImportRows(
  rows: string[][]
): HrmEmployeeImportRow[] {
  const summary = dryRunEmployees(rows)
  if (summary.errors.length > 0 || summary.rowCount === 0) {
    return []
  }
  const header = rows[0].map((h) => h.toLowerCase())
  const idxNum = header.indexOf("employee_number")
  const idxName = header.indexOf("display_name")
  const out: HrmEmployeeImportRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const num = r[idxNum]?.trim() ?? ""
    const name = r[idxName]?.trim() ?? ""
    if (num && name && num.length <= 64 && name.length <= 200) {
      out.push({ employeeNumber: num, legalName: name })
    }
  }
  return out
}

export function dryRunAttendance(rows: string[][]): {
  rowCount: number
  errors: HrmImportRowErr[]
} {
  const errors: HrmImportRowErr[] = []
  if (rows.length < 2) {
    errors.push({
      line: 1,
      message: "CSV must include a header row and at least one data row.",
    })
    return { rowCount: 0, errors }
  }
  const header = rows[0].map((h) => h.toLowerCase())
  const need = ["employee_id", "event_type", "occurred_at"]
  for (const h of need) {
    if (!header.includes(h)) {
      errors.push({ line: 1, message: `Missing required header: ${h}` })
      return { rowCount: 0, errors }
    }
  }
  const iEmp = header.indexOf("employee_id")
  const iType = header.indexOf("event_type")
  const iAt = header.indexOf("occurred_at")
  let dataRows = 0
  const types = new Set(["clock_in", "clock_out", "break_start", "break_end"])
  for (let i = 1; i < rows.length; i++) {
    const lineNo = i + 1
    const r = rows[i]
    const emp = r[iEmp]?.trim()
    const et = r[iType]?.trim()
    const at = r[iAt]?.trim()
    if (!emp) errors.push({ line: lineNo, message: "employee_id required" })
    if (!et || !types.has(et)) {
      errors.push({ line: lineNo, message: "invalid event_type" })
    }
    if (!at || Number.isNaN(new Date(at).getTime())) {
      errors.push({ line: lineNo, message: "invalid occurred_at" })
    }
    if (
      emp &&
      et &&
      types.has(et) &&
      at &&
      !Number.isNaN(new Date(at).getTime())
    ) {
      dataRows += 1
    }
  }
  return { rowCount: dataRows, errors }
}

export function dryRunPayroll(rows: string[][]): {
  rowCount: number
  errors: HrmImportRowErr[]
} {
  const errors: HrmImportRowErr[] = []
  if (rows.length < 2) {
    errors.push({
      line: 1,
      message: "CSV must include a header row and at least one data row.",
    })
    return { rowCount: 0, errors }
  }
  const header = rows[0].map((h) => h.toLowerCase())
  if (!header.includes("employee_id") || !header.includes("amount")) {
    errors.push({
      line: 1,
      message: "Missing required headers: employee_id, amount",
    })
    return { rowCount: 0, errors }
  }
  const iEmp = header.indexOf("employee_id")
  const iAmt = header.indexOf("amount")
  let dataRows = 0
  for (let i = 1; i < rows.length; i++) {
    const lineNo = i + 1
    const r = rows[i]
    const emp = r[iEmp]?.trim()
    const amt = Number(r[iAmt])
    if (!emp) errors.push({ line: lineNo, message: "employee_id required" })
    if (!Number.isFinite(amt))
      errors.push({ line: lineNo, message: "amount must be numeric" })
    if (emp && Number.isFinite(amt)) dataRows += 1
  }
  return { rowCount: dataRows, errors }
}
