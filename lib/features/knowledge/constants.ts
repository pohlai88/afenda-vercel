export {
  organizationDashboardPath,
  ORG_DASHBOARD_KNOWLEDGE,
} from "#lib/dashboard-module-paths"

/** Must match `vector(..., { dimensions: N })` and the embedding model output. */
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 1536 as const

/** Registered adapters: `source-adapter-registry.server.ts` plus manual ingest. */
export const KNOWLEDGE_SOURCE_KINDS = ["manual", "github_repo"] as const

export type KnowledgeSourceKind = (typeof KNOWLEDGE_SOURCE_KINDS)[number]

export const KNOWLEDGE_AUDIT_ACTIONS = {
  SOURCE_CREATE: "erp.knowledge.source.create",
  SOURCE_UPDATE: "erp.knowledge.source.update",
  SOURCE_DELETE: "erp.knowledge.source.delete",
  DOCUMENT_EMBED_COMPLETED: "erp.knowledge.document.embed_completed",
  SOURCE_SYNC_START: "erp.knowledge.source.sync.start",
  SOURCE_SYNC_COMPLETE: "erp.knowledge.source.sync.complete",
  SOURCE_SYNC_FAIL: "erp.knowledge.source.sync.fail",
  SOURCE_SYNC_CANCEL: "erp.knowledge.source.sync.cancel",
  SETTINGS_UPDATE: "erp.knowledge.settings.update",
  EVAL_RUN: "erp.knowledge.eval.run",
} as const
