import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical CRUD-SAP audit action strings for Employee Records Management.
 *
 * Covers: HRM-EMP-REC-019 (audit trail for all employee record changes).
 *
 * Usage: import { HRM_EMPLOYEE_RECORDS_AUDIT } from "./employee-records.contract"
 * Never hard-code "erp.hrm.employee.*" strings in action files — always reference this map.
 */
export const HRM_EMPLOYEE_RECORDS_AUDIT = {
  employee: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee",
      verb: "update",
    }),
    /** Archive (separation) — employee record moves to read-only. HRM-EMP-REC-020. */
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee",
      verb: "deprecate",
    }),
    /** Rehire — restores an archived record without overwriting history. HRM-EMP-REC-016. */
    create_rehire: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee",
      verb: "create",
    }),
    audit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee",
      verb: "audit",
    }),
  },

  /** Identity: legal name, preferred name, date of birth, gender, nationality. HRM-EMP-REC-003/004. */
  identity: {
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.identity",
      verb: "update",
    }),
  },

  /** Contact information: work/personal email, phone, residential address, mailing address. HRM-EMP-REC-005. */
  contact: {
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.contact",
      verb: "update",
    }),
  },

  /** Employment information: type, status, hire date, probation, confirmation, contract dates. HRM-EMP-REC-007. */
  employment: {
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.employment",
      verb: "update",
    }),
  },

  /** Job assignment: job title, job code, grade, level, worker category. HRM-EMP-REC-008. */
  jobAssignment: {
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.job_assignment",
      verb: "update",
    }),
  },

  /** Organization assignment: department, position, manager, cost center, work location. HRM-EMP-REC-009/010/017. */
  assignment: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.assignment",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.assignment",
      verb: "update",
    }),
  },

  /** Identity documents: IC, passport, work permit. HRM-EMP-REC-003/013. */
  identityDocument: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.identity_document",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.identity_document",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.identity_document",
      verb: "deprecate",
    }),
  },

  /** Work authorization: visa, work permit. HRM-EMP-REC-013. */
  workAuthorization: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.work_authorization",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.work_authorization",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.work_authorization",
      verb: "deprecate",
    }),
  },

  /** Emergency contact. HRM-EMP-REC-006. */
  emergencyContact: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.emergency_contact",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.emergency_contact",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.emergency_contact",
      verb: "deprecate",
    }),
  },

  /** Statutory / payroll profile: tax ID, EPF, SOCSO, insurance. */
  statutory: {
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "employee.statutory",
      verb: "update",
    }),
  },
} as const

export type HrmEmployeeRecordsAuditSection =
  (typeof HRM_EMPLOYEE_RECORDS_AUDIT)[keyof typeof HRM_EMPLOYEE_RECORDS_AUDIT]
