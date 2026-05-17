import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

export const HRM_TRAINING_AUDIT = {
  category: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.category",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.category",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.category",
      verb: "deprecate",
    }),
  },
  course: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.course",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.course",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.course",
      verb: "deprecate",
    }),
    audit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.course",
      verb: "audit",
    }),
  },
  session: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.session",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.session",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.session",
      verb: "deprecate",
    }),
    audit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.session",
      verb: "audit",
    }),
  },
  assignment: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.assignment",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.assignment",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.assignment",
      verb: "deprecate",
    }),
  },
  record: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.record",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.record",
      verb: "update",
    }),
    audit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.record",
      verb: "audit",
    }),
  },
  recertification: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "training.recertification",
      verb: "create",
    }),
  },
} as const
