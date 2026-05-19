import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit + outbound event strings for Leave & Attendance Management.
 * Import from this module — do not hard-code `erp.hrm.leave.*` in action files.
 */
export const HRM_LAM_AUDIT = {
  leave: {
    requestCreate: "erp.hrm.leave.request.create",
    requestCancel: "erp.hrm.leave.request.cancel",
    requestReturn: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "leave.request",
      verb: "deprecate",
    }),
    balanceAdjust: "erp.hrm.leave.balance.adjust",
    balanceCarryForward: "erp.hrm.leave.balance.carry_forward",
  },
  leaveType: {
    create: "erp.hrm.leave_type.create",
    update: "erp.hrm.leave_type.update",
    seed: "erp.hrm.leave_type.seed",
  },
  policy: {
    update: "erp.hrm.policy.update",
  },
  orgHoliday: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "org_holiday",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "org_holiday",
      verb: "update",
    }),
    delete: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "org_holiday",
      verb: "deprecate",
    }),
  },
  blackout: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "leave_blackout",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "leave_blackout",
      verb: "update",
    }),
    delete: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "leave_blackout",
      verb: "deprecate",
    }),
  },
  attendance: {
    eventCreate: "erp.hrm.attendance.event.create",
    dayUpdate: "erp.hrm.attendance.day.update",
    shiftTemplateCreate: "erp.hrm.attendance.shift_template.create",
    shiftAssignmentUpdate: "erp.hrm.attendance.shift_assignment.update",
    correctionSubmit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "attendance.correction",
      verb: "create",
    }),
  },
  timeReport: {
    create: "erp.hrm.time_report.create",
    cancel: "erp.hrm.time_report.cancel",
  },
  report: {
    leaveExport: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "leave.report",
      verb: "audit",
    }),
    attendanceExport: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "attendance.report",
      verb: "audit",
    }),
  },
  approval: {
    request: "erp.hrm.approval.request",
    approve: "erp.hrm.approval.approve",
    reject: "erp.hrm.approval.reject",
    cancel: "erp.hrm.approval.cancel",
    return: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "approval",
      verb: "deprecate",
    }),
  },
} as const

/** Subscribable outbound delivery topics (must match `ORG_EVENT_TYPES` when enabled). */
export const HRM_LAM_LEAVE_EVENT_TYPES = {
  submitted: "erp.hrm.leave.submitted",
  approved: "erp.hrm.leave.approved",
  rejected: "erp.hrm.leave.rejected",
  returned: "erp.hrm.leave.returned",
  cancelled: "erp.hrm.leave.cancelled",
  overdue: "erp.hrm.leave.overdue",
} as const
