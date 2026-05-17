import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Audit strings for Multi-Country Payroll (HRM-MCP-028).
 * Country configuration and rule-pack versioning — not payroll run execution.
 */
export const HRM_MULTI_COUNTRY_PAYROLL_AUDIT = {
  country_config: {
    /** Country payroll settings referenced or inspected. HRM-MCP-001/002. */
    viewed: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_country_config",
      verb: "search",
    }),
  },
  legal_entity: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_legal_entity_config",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_legal_entity_config",
      verb: "update",
    }),
  },
  pay_component_treatment: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_pay_component_treatment",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_pay_component_treatment",
      verb: "update",
    }),
  },
  exchange_rate: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_exchange_rate",
      verb: "create",
    }),
  },
  rule_pack: {
    /** Rule pack version pinned on period lock. HRM-MCP-023/024. */
    version_pinned: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_rule_pack",
      verb: "audit",
    }),
    /** Registry mirrored to DB. HRM-MCP-023. */
    sync: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_rule_pack",
      verb: "update",
    }),
  },
  readiness: {
    /** Statutory readiness check before country payroll. HRM-MCP-015. */
    assessed: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_country_readiness",
      verb: "audit",
    }),
  },
  export: {
    /** Statutory portal or vendor export generated. HRM-MCP-021/022. */
    generated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_country_export",
      verb: "create",
    }),
  },
  report: {
    /** Cross-country payroll cost report viewed. HRM-MCP-026/027. */
    search: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_cross_country_report",
      verb: "search",
    }),
  },
} as const
