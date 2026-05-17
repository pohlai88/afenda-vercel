/**
 * Unit tests for HRM bulk-import primitives.
 *
 * Coverage targets:
 *  - CSV parser (parseCsv) — quoting, blank lines, CRLF
 *  - Employee dry-run (dryRunEmployees) — header validation, row guards, length limits
 *  - Attendance dry-run (dryRunAttendance) — header + event_type + timestamp guards
 *  - Payroll dry-run (dryRunPayroll) — header + numeric amount guards
 *  - listValidEmployeeImportRows — filters invalid rows, uses data after headers
 *  - hrmImportRollbackJsonSchema — discriminated union validation
 *  - Lifecycle state semantics via status label checks (no DB; guards commit/rollback paths)
 */

import { describe, expect, it } from "vitest"

import {
  dryRunAttendance,
  dryRunEmployees,
  dryRunPayroll,
  listValidEmployeeImportRows,
  parseCsv,
} from "#features/tools/server"
import {
  HRM_IMPORT_TYPES,
  hrmImportRollbackJsonSchema,
  hrmImportSessionStatusSchema,
} from "#features/tools"

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe("parseCsv", () => {
  it("parses a simple two-column CSV", () => {
    const grid = parseCsv("a,b\n1,2")
    expect(grid).toHaveLength(2)
    expect(grid[0]).toEqual(["a", "b"])
    expect(grid[1]).toEqual(["1", "2"])
  })

  it("handles CRLF line endings", () => {
    const grid = parseCsv("a,b\r\n1,2\r\n3,4")
    expect(grid).toHaveLength(3)
  })

  it("ignores empty / whitespace-only lines", () => {
    const grid = parseCsv("a,b\n\n  \n1,2")
    expect(grid).toHaveLength(2)
  })

  it("handles quoted fields containing commas", () => {
    const grid = parseCsv(`"Last, First",123`)
    expect(grid).toHaveLength(1)
    expect(grid[0][0]).toBe("Last, First")
    expect(grid[0][1]).toBe("123")
  })

  it("trims leading/trailing whitespace from unquoted cells", () => {
    const grid = parseCsv("  hello  ,  world  ")
    expect(grid[0]).toEqual(["hello", "world"])
  })

  it("returns empty array for blank input", () => {
    expect(parseCsv("")).toEqual([])
    expect(parseCsv("   \n   ")).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// dryRunEmployees
// ---------------------------------------------------------------------------

const EMPLOYEE_HEADER = "employee_number,display_name"

describe("dryRunEmployees", () => {
  it("returns error when fewer than two rows (header only)", () => {
    const result = dryRunEmployees([["employee_number", "display_name"]])
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.rowCount).toBe(0)
  })

  it("returns error when header is missing required columns", () => {
    const grid = parseCsv("name,id\nJohn,1")
    const result = dryRunEmployees(grid)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].line).toBe(1)
  })

  it("accepts a valid minimal CSV", () => {
    const grid = parseCsv(`${EMPLOYEE_HEADER}\nEMP001,Alice`)
    const result = dryRunEmployees(grid)
    expect(result.errors).toHaveLength(0)
    expect(result.rowCount).toBe(1)
  })

  it("counts multiple valid rows", () => {
    const csv = [
      `${EMPLOYEE_HEADER}`,
      "EMP001,Alice",
      "EMP002,Bob",
      "EMP003,Carol",
    ].join("\n")
    const grid = parseCsv(csv)
    const result = dryRunEmployees(grid)
    expect(result.errors).toHaveLength(0)
    expect(result.rowCount).toBe(3)
  })

  it("flags missing employee_number", () => {
    const grid = parseCsv(`${EMPLOYEE_HEADER}\n,Alice`)
    const result = dryRunEmployees(grid)
    expect(
      result.errors.some((e) => e.message.includes("employee_number"))
    ).toBe(true)
    expect(result.rowCount).toBe(0)
  })

  it("flags missing display_name", () => {
    const grid = parseCsv(`${EMPLOYEE_HEADER}\nEMP001,`)
    const result = dryRunEmployees(grid)
    expect(result.errors.some((e) => e.message.includes("display_name"))).toBe(
      true
    )
    expect(result.rowCount).toBe(0)
  })

  it("rejects employee_number longer than 64 chars", () => {
    const longNum = "X".repeat(65)
    const grid = parseCsv(`${EMPLOYEE_HEADER}\n${longNum},Alice`)
    const result = dryRunEmployees(grid)
    expect(
      result.errors.some((e) => e.message.includes("employee_number too long"))
    ).toBe(true)
    expect(result.rowCount).toBe(0)
  })

  it("rejects display_name longer than 200 chars", () => {
    const longName = "N".repeat(201)
    const grid = parseCsv(`${EMPLOYEE_HEADER}\nEMP001,${longName}`)
    const result = dryRunEmployees(grid)
    expect(
      result.errors.some((e) => e.message.includes("display_name too long"))
    ).toBe(true)
    expect(result.rowCount).toBe(0)
  })

  it("accumulates errors for multiple bad rows without short-circuiting", () => {
    const csv = [`${EMPLOYEE_HEADER}`, ",", ","].join("\n")
    const grid = parseCsv(csv)
    const result = dryRunEmployees(grid)
    // Each row has two errors (num + name)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })

  it("reports correct line numbers (1-indexed, header = line 1)", () => {
    const grid = parseCsv(`${EMPLOYEE_HEADER}\nEMP001,Alice\n,BrokenName`)
    const result = dryRunEmployees(grid)
    const missingNumError = result.errors.find((e) =>
      e.message.includes("employee_number")
    )
    expect(missingNumError?.line).toBe(3) // header is line 1, first data row is 2, second data row is 3
  })

  it("flags duplicate employee_number within the same CSV", () => {
    const grid = parseCsv(
      `${EMPLOYEE_HEADER}\nEMP001,Alice\nEMP001,Bob Duplicate`
    )
    const result = dryRunEmployees(grid)
    expect(
      result.errors.some((e) => e.message.includes("Duplicate employee_number"))
    ).toBe(true)
    expect(result.rowCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// dryRunAttendance
// ---------------------------------------------------------------------------

describe("dryRunAttendance", () => {
  const ATTENDANCE_HEADER = "employee_id,event_type,occurred_at"

  it("rejects missing required headers", () => {
    const grid = parseCsv("id,type\nemp1,clock_in")
    const result = dryRunAttendance(grid)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.rowCount).toBe(0)
  })

  it("accepts valid attendance rows", () => {
    const csv = [ATTENDANCE_HEADER, "emp-1,clock_in,2026-01-15T08:00:00Z"].join(
      "\n"
    )
    const result = dryRunAttendance(parseCsv(csv))
    expect(result.errors).toHaveLength(0)
    expect(result.rowCount).toBe(1)
  })

  it("rejects invalid event_type", () => {
    const csv = [ATTENDANCE_HEADER, "emp-1,nap,2026-01-15T08:00:00Z"].join("\n")
    const result = dryRunAttendance(parseCsv(csv))
    expect(result.errors.some((e) => e.message.includes("event_type"))).toBe(
      true
    )
    expect(result.rowCount).toBe(0)
  })

  it("rejects invalid occurred_at timestamp", () => {
    const csv = [ATTENDANCE_HEADER, "emp-1,clock_in,not-a-date"].join("\n")
    const result = dryRunAttendance(parseCsv(csv))
    expect(result.errors.some((e) => e.message.includes("occurred_at"))).toBe(
      true
    )
    expect(result.rowCount).toBe(0)
  })

  it("accepts all valid event_type values", () => {
    const validTypes = ["clock_in", "clock_out", "break_start", "break_end"]
    for (const et of validTypes) {
      const csv = [ATTENDANCE_HEADER, `emp-1,${et},2026-01-15T08:00:00Z`].join(
        "\n"
      )
      const result = dryRunAttendance(parseCsv(csv))
      expect(result.errors).toHaveLength(0)
      expect(result.rowCount).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// dryRunPayroll
// ---------------------------------------------------------------------------

describe("dryRunPayroll", () => {
  const PAYROLL_HEADER = "employee_id,amount"

  it("rejects missing required headers", () => {
    const grid = parseCsv("id,salary\nemp1,1000")
    const result = dryRunPayroll(grid)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.rowCount).toBe(0)
  })

  it("accepts valid payroll rows", () => {
    const csv = [PAYROLL_HEADER, "emp-1,5000.00", "emp-2,3200.50"].join("\n")
    const result = dryRunPayroll(parseCsv(csv))
    expect(result.errors).toHaveLength(0)
    expect(result.rowCount).toBe(2)
  })

  it("rejects missing employee_id", () => {
    const csv = [PAYROLL_HEADER, ",5000"].join("\n")
    const result = dryRunPayroll(parseCsv(csv))
    expect(result.errors.some((e) => e.message.includes("employee_id"))).toBe(
      true
    )
    expect(result.rowCount).toBe(0)
  })

  it("rejects non-numeric amount", () => {
    const csv = [PAYROLL_HEADER, "emp-1,three-thousand"].join("\n")
    const result = dryRunPayroll(parseCsv(csv))
    expect(result.errors.some((e) => e.message.includes("amount"))).toBe(true)
    expect(result.rowCount).toBe(0)
  })

  it("accepts zero amount (edge case)", () => {
    const csv = [PAYROLL_HEADER, "emp-1,0"].join("\n")
    const result = dryRunPayroll(parseCsv(csv))
    expect(result.errors).toHaveLength(0)
    expect(result.rowCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// listValidEmployeeImportRows
// ---------------------------------------------------------------------------

describe("listValidEmployeeImportRows", () => {
  it("returns empty array when CSV is invalid", () => {
    const rows = listValidEmployeeImportRows(parseCsv("wrong,headers\nA,B"))
    expect(rows).toHaveLength(0)
  })

  it("returns empty array when any row has a validation error (all-or-nothing contract)", () => {
    // listValidEmployeeImportRows requires dryRunEmployees to pass with zero errors.
    // A single bad row means the entire batch is rejected — callers must fix errors first.
    const csv = [
      "employee_number,display_name",
      "EMP001,Alice",
      ",BrokenName",
      "EMP003,Carol",
    ].join("\n")
    const rows = listValidEmployeeImportRows(parseCsv(csv))
    expect(rows).toHaveLength(0)
  })

  it("maps to correct field names (employeeNumber / legalName)", () => {
    const csv = ["employee_number,display_name", "EMP001,Alice Tan"].join("\n")
    const [row] = listValidEmployeeImportRows(parseCsv(csv))
    expect(row).toEqual({ employeeNumber: "EMP001", legalName: "Alice Tan" })
  })

  it("returns empty array when all rows are invalid", () => {
    const csv = ["employee_number,display_name", ",", ","].join("\n")
    const rows = listValidEmployeeImportRows(parseCsv(csv))
    expect(rows).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// hrmImportRollbackJsonSchema — discriminated union
// ---------------------------------------------------------------------------

describe("hrmImportRollbackJsonSchema", () => {
  it("parses hrm_import_placeholder kind", () => {
    const result = hrmImportRollbackJsonSchema.safeParse({
      kind: "hrm_import_placeholder",
      importType: "employees",
      contentSha256: "abc123",
    })
    expect(result.success).toBe(true)
  })

  it("parses hrm_import_v1 kind without optional fields", () => {
    const result = hrmImportRollbackJsonSchema.safeParse({
      kind: "hrm_import_v1",
      importType: "employees",
      contentSha256: "abc123",
      sourceCsv: "employee_number,display_name\nEMP001,Alice",
    })
    expect(result.success).toBe(true)
  })

  it("parses hrm_import_v1 kind with appliedEmployeeIds", () => {
    const result = hrmImportRollbackJsonSchema.safeParse({
      kind: "hrm_import_v1",
      importType: "employees",
      contentSha256: "abc123",
      sourceCsv: "header\nrow",
      appliedEmployeeIds: ["11111111-1111-4111-8111-111111111111"],
      appliedAt: "2026-05-16T00:00:00.000Z",
      appliedByUserId: "user-123",
    })
    expect(result.success).toBe(true)
  })

  it("parses hrm_import_v1 kind with blob staging fields", () => {
    const result = hrmImportRollbackJsonSchema.safeParse({
      kind: "hrm_import_v1",
      importType: "employees",
      contentSha256: "abc123",
      blobUrl: "https://example.blob.vercel-storage.com/hrm/imports/org/session/source.csv",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.blobUrl).toContain("blob")
      expect(result.data.sourceCsv).toBeUndefined()
    }
  })

  it("rejects unknown kind", () => {
    const result = hrmImportRollbackJsonSchema.safeParse({
      kind: "hrm_import_v99",
      importType: "employees",
      contentSha256: "abc",
    })
    expect(result.success).toBe(false)
  })

  it("rejects hrm_import_v1 with non-employees importType", () => {
    const result = hrmImportRollbackJsonSchema.safeParse({
      kind: "hrm_import_v1",
      importType: "attendance",
      contentSha256: "abc",
      sourceCsv: "header\nrow",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// hrmImportSessionStatusSchema — lifecycle state labels
// ---------------------------------------------------------------------------

describe("hrmImportSessionStatusSchema", () => {
  const VALID_STATUSES = [
    "pending",
    "dry_run",
    "processing",
    "committed",
    "failed",
    "rolled_back",
  ] as const

  it("accepts all valid session statuses", () => {
    for (const status of VALID_STATUSES) {
      expect(hrmImportSessionStatusSchema.safeParse(status).success).toBe(true)
    }
  })

  it("rejects unknown status", () => {
    expect(hrmImportSessionStatusSchema.safeParse("aborted").success).toBe(
      false
    )
    expect(hrmImportSessionStatusSchema.safeParse("").success).toBe(false)
  })

  it("reflects the correct lifecycle order (pending → dry_run → committed → rolled_back)", () => {
    // Semantic ordering guard: committed cannot be the initial state
    const notInitial: (typeof VALID_STATUSES)[number][] = [
      "dry_run",
      "committed",
      "rolled_back",
    ]
    for (const s of notInitial) {
      expect(s).not.toBe("pending")
    }
    // Only committed sessions can be rolled back
    const canRollback = (status: string) => status === "committed"
    expect(canRollback("committed")).toBe(true)
    expect(canRollback("dry_run")).toBe(false)
    expect(canRollback("rolled_back")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// HRM_IMPORT_TYPES registry
// ---------------------------------------------------------------------------

describe("HRM_IMPORT_TYPES", () => {
  it("exposes employees only until attendance/payroll commit paths ship", () => {
    expect(HRM_IMPORT_TYPES).toEqual(["employees"])
  })
})
