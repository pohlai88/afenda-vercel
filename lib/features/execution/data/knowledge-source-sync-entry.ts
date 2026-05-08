/**
 * Server-only indirection so enqueue API can resolve knowledge workflow
 * without leaking workflow entrypoints to the public knowledge barrel.
 */
export { runKnowledgeSourceSyncWorkflow } from "../../knowledge/data/source-sync.workflow"
