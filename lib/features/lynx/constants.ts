export {
  organizationDashboardPath,
  ORG_DASHBOARD_LYNX,
} from "#lib/dashboard-module-paths"

/** Retrieved passages passed to the model (org-scoped). */
export const LYNX_TRUTH_TOP_K = 8 as const

/** Default cap for truth answer length (override with `LYNX_MAX_OUTPUT_TOKENS`). */
export const LYNX_TRUTH_DEFAULT_MAX_OUTPUT_TOKENS = 4096 as const
