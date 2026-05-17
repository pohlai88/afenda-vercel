import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical CRUD-SAP audit action strings for internal Recruitment & ATS (Workbench).
 *
 * Portal-facing candidate events use {@link HRM_CSSP_AUDIT} in
 * `candidate-selfservice-portal/cssp.contract.ts`.
 */
export const HRM_RECRUITMENT_AUDIT = {
  requisition: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.requisition",
      verb: "create",
    }),
    publish: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.requisition",
      verb: "update",
    }),
    cancel: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.requisition",
      verb: "deprecate",
    }),
    submitApproval: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.requisition",
      verb: "update",
    }),
    approve: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.requisition",
      verb: "resolve",
    }),
    reject: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.requisition",
      verb: "deprecate",
    }),
  },
  application: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.application",
      verb: "create",
    }),
    stage: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.application",
      verb: "update",
    }),
  },
  interview: {
    schedule: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.interview",
      verb: "create",
    }),
    feedback: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.interview",
      verb: "update",
    }),
    assignPanel: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.interview",
      verb: "update",
    }),
    scorecardSubmit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.scorecard",
      verb: "create",
    }),
  },
  offer: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.offer",
      verb: "create",
    }),
    updateStatus: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.offer",
      verb: "update",
    }),
  },
  hire: {
    convert: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "recruitment.hire",
      verb: "resolve",
    }),
  },
} as const
