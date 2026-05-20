import "server-only"

import type {
  LeaveBalanceRow,
  LeaveRequestRow,
} from "#features/hrm/server"

export type DemoEmployeeLeaveFixture = {
  employeeNumber: string
  legalName: string
  organizationName: string
  portalDisplayName: string
  balances: readonly LeaveBalanceRow[]
  requests: readonly LeaveRequestRow[]
  leaveTypeLabels: readonly { id: string; code: string; label: string }[]
}

const DEMO_LEAVE_TYPE_ANNUAL = "00000000-0000-4000-8000-0000000000a1"
const DEMO_LEAVE_TYPE_MEDICAL = "00000000-0000-4000-8000-0000000000a2"

const DEMO_BALANCE_ANNUAL = {
  id: "00000000-0000-4000-8000-0000000000b1",
  leaveTypeId: DEMO_LEAVE_TYPE_ANNUAL,
  leaveTypeCode: "ANNUAL",
  entitlementYear: 2026,
  daysEntitled: "14.0",
  daysTaken: "3.0",
  daysPending: "1.0",
  openingDays: "14.0",
  adjustedDays: "0.0",
  carriedForwardDays: "0.0",
  lastRecomputedAt: new Date("2026-01-15T08:00:00.000Z"),
} as const satisfies LeaveBalanceRow

const DEMO_BALANCE_MEDICAL = {
  id: "00000000-0000-4000-8000-0000000000b2",
  leaveTypeId: DEMO_LEAVE_TYPE_MEDICAL,
  leaveTypeCode: "MEDICAL",
  entitlementYear: 2026,
  daysEntitled: "14.0",
  daysTaken: "0.0",
  daysPending: "0.0",
  openingDays: "14.0",
  adjustedDays: "0.0",
  carriedForwardDays: "0.0",
  lastRecomputedAt: new Date("2026-01-15T08:00:00.000Z"),
} as const satisfies LeaveBalanceRow

const DEMO_REQUEST_APPROVED = {
  id: "00000000-0000-4000-8000-0000000000c1",
  employeeId: "00000000-0000-4000-8000-000000000011",
  leaveTypeId: DEMO_LEAVE_TYPE_ANNUAL,
  leaveTypeCode: "ANNUAL",
  requestedAt: new Date("2026-02-10T09:00:00.000Z"),
  startDate: "2026-03-03",
  endDate: "2026-03-05",
  durationDays: "3.0",
  halfDay: "none",
  reason: "Family travel",
  state: "approved",
  currentApprovalId: null,
  approvedByUserId: null,
  approvedAt: new Date("2026-02-11T14:00:00.000Z"),
  rejectedReason: null,
  policyVersion: "demo-v1",
  createdAt: new Date("2026-02-10T09:00:00.000Z"),
  updatedAt: new Date("2026-02-11T14:00:00.000Z"),
} as const satisfies LeaveRequestRow

const DEMO_REQUEST_SUBMITTED = {
  id: "00000000-0000-4000-8000-0000000000c2",
  employeeId: "00000000-0000-4000-8000-000000000011",
  leaveTypeId: DEMO_LEAVE_TYPE_ANNUAL,
  leaveTypeCode: "ANNUAL",
  requestedAt: new Date("2026-04-01T10:00:00.000Z"),
  startDate: "2026-05-12",
  endDate: "2026-05-12",
  durationDays: "1.0",
  halfDay: "morning",
  reason: "Medical appointment",
  state: "submitted",
  currentApprovalId: null,
  approvedByUserId: null,
  approvedAt: null,
  rejectedReason: null,
  policyVersion: "demo-v1",
  createdAt: new Date("2026-04-01T10:00:00.000Z"),
  updatedAt: new Date("2026-04-01T10:00:00.000Z"),
} as const satisfies LeaveRequestRow

export function getDemoEmployeeLeaveFixture(): DemoEmployeeLeaveFixture {
  return {
    employeeNumber: "EMP-DEMO-001",
    legalName: "Alex Demo",
    organizationName: "Demo Organization",
    portalDisplayName: "Employee portal",
    balances: [DEMO_BALANCE_ANNUAL, DEMO_BALANCE_MEDICAL],
    requests: [DEMO_REQUEST_APPROVED, DEMO_REQUEST_SUBMITTED],
    leaveTypeLabels: [
      { id: DEMO_LEAVE_TYPE_ANNUAL, code: "ANNUAL", label: "Annual leave" },
      { id: DEMO_LEAVE_TYPE_MEDICAL, code: "MEDICAL", label: "Medical leave" },
    ],
  }
}
