import {
  buildCrudSapAuditAction,
  buildErpAuditAction,
} from "#lib/erp/crud-sap.shared"

export const SFT_SWAP_APPROVAL_SUBJECT_KIND = "shift_swap_request" as const

export const HRM_SFT_AUDIT = {
  templateCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_template",
    verb: "create",
  }),
  templateUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_template",
    verb: "update",
  }),
  assignmentCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_assignment",
    verb: "create",
  }),
  assignmentUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_assignment",
    verb: "update",
  }),
  assignmentBulk: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_assignment",
    verb: "update",
  }),
  recurrenceCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_recurrence_rule",
    verb: "create",
  }),
  recurrenceApply: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_recurrence",
    verb: "create",
  }),
  rotationCycleCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_rotation_cycle",
    verb: "create",
  }),
  rotationApply: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_rotation",
    verb: "create",
  }),
  policyUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_scheduling_policy",
    verb: "update",
  }),
  coverageCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_coverage",
    verb: "create",
  }),
  swapCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_swap_request",
    verb: "create",
  }),
  swapApprove: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_swap.request",
    verb: "approve",
  }),
  swapReject: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_swap.request",
    verb: "reject",
  }),
  swapReturn: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_swap.request",
    verb: "update",
  }),
  swapOverride: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_swap.request",
    verb: "update",
  }),
  rotationStepCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_rotation_step",
    verb: "create",
  }),
  rosterPublish: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_roster",
    verb: "update",
  }),
  reportExport: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_schedule_report",
    verb: "audit",
  }),
  scheduleChangeSubmit: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_schedule_change",
    verb: "create",
  }),
  scheduleChangeApprove: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_schedule_change.request",
    verb: "approve",
  }),
  scheduleChangeReject: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_schedule_change.request",
    verb: "reject",
  }),
  scheduleChangeReturn: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_schedule_change.request",
    verb: "update",
  }),
  availabilityCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_availability",
    verb: "create",
  }),
  restOffPlanApply: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_rest_off_plan",
    verb: "create",
  }),
  holidayPlanApply: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "shift_holiday_plan",
    verb: "create",
  }),
} as const

export type HrmSftAuditAction =
  (typeof HRM_SFT_AUDIT)[keyof typeof HRM_SFT_AUDIT]
