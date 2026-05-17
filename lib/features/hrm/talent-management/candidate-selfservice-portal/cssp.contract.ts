import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit strings for the Candidate Self-Service Portal (external).
 *
 * Internal recruiter/workbench events remain in
 * `recruitment-applicant-tracking/recruitment.contract.ts`.
 */
export const HRM_CSSP_AUDIT = {
  application: {
    submit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "cssp.application",
      verb: "create",
    }),
    withdraw: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "cssp.application",
      verb: "update",
    }),
  },
  candidate: {
    magicLinkIssued: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "cssp.candidate",
      verb: "create",
    }),
  },
  offer: {
    accept: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "cssp.offer",
      verb: "resolve",
    }),
    decline: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "cssp.offer",
      verb: "deprecate",
    }),
  },
} as const
