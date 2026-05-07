export {
  organizationDashboardPath,
  ORG_DASHBOARD_KNOWLEDGE,
} from "#lib/dashboard-module-paths"

/** Must match `vector(..., { dimensions: N })` and the embedding model output. */
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 1536 as const
