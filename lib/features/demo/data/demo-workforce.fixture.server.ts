import "server-only"

import type { EmployeeRow } from "#features/hrm/server"

/** Fixture org slug for demo row links (not a live tenant). */
export const DEMO_WORKFORCE_ORG_SLUG = "acme-demo"

const DEMO_WORKFORCE_ROWS = [
  {
    id: "demo-emp-001",
    employeeNumber: "EMP-1001",
    legalName: "Alex Morgan",
    preferredName: "Alex",
    email: "alex.morgan@example.com",
    archivedAt: null,
  },
  {
    id: "demo-emp-002",
    employeeNumber: "EMP-1002",
    legalName: "Jordan Lee",
    preferredName: null,
    email: "jordan.lee@example.com",
    archivedAt: null,
  },
  {
    id: "demo-emp-003",
    employeeNumber: "EMP-1003",
    legalName: "Samira Patel",
    preferredName: "Sam",
    email: "samira.patel@example.com",
    archivedAt: null,
  },
  {
    id: "demo-emp-004",
    employeeNumber: "EMP-0998",
    legalName: "Chris Nguyen",
    preferredName: null,
    email: null,
    archivedAt: new Date("2025-12-01T00:00:00.000Z"),
  },
] as const satisfies readonly EmployeeRow[]

export function getDemoWorkforceFixture(): readonly EmployeeRow[] {
  return DEMO_WORKFORCE_ROWS
}
