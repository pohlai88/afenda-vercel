export {
  organizationDashboardPath,
  ORG_DASHBOARD_LYNX,
} from "#lib/dashboard-module-paths"

/** Retrieved passages passed to the model (org-scoped). */
export const LYNX_TRUTH_TOP_K = 8 as const

/** Default cap for truth answer length (override with `LYNX_MAX_OUTPUT_TOKENS`). */
export const LYNX_TRUTH_DEFAULT_MAX_OUTPUT_TOKENS = 4096 as const

/** Operator assist — max tool round-trips per request. */
export const LYNX_OPERATOR_MAX_STEPS = 5 as const

/** Default generation cap for operator stream (override with `LYNX_OPERATOR_MAX_OUTPUT_TOKENS`). */
export const LYNX_OPERATOR_DEFAULT_MAX_OUTPUT_TOKENS = 2048 as const

/** Governed operator tools — compile-time id list; `createLynxOperatorToolRegistry` must match order and membership. */
export const LYNX_OPERATOR_TOOL_IDS = [
  "org_contact_count",
  "org_recent_contacts",
  "org_recent_knowledge_chunks",
  "org_search_knowledge",
  "org_active_import_jobs",
] as const
