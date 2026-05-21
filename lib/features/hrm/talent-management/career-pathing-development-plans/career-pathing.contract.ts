import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

export const HRM_CAREER_PATH_AUDIT = {
  framework: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.framework",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.framework",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.framework",
      verb: "deprecate",
    }),
  },
  aspiration: {
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.aspiration",
      verb: "update",
    }),
  },
  targetRole: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.target_role",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.target_role",
      verb: "update",
    }),
  },
  plan: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.development_plan",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.development_plan",
      verb: "update",
    }),
  },
  goal: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.development_goal",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.development_goal",
      verb: "update",
    }),
  },
  milestone: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.milestone",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.milestone",
      verb: "update",
    }),
  },
  learningAction: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.learning_action",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.learning_action",
      verb: "update",
    }),
  },
  stretch: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.stretch_assignment",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.stretch_assignment",
      verb: "update",
    }),
  },
  mentor: {
    assign: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.mentor",
      verb: "create",
    }),
  },
  coach: {
    assign: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.coach",
      verb: "create",
    }),
  },
  session: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.session",
      verb: "create",
    }),
  },
  discussion: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.discussion",
      verb: "create",
    }),
  },
  readiness: {
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "career_path.readiness",
      verb: "update",
    }),
  },
} as const
