/**
 * Server-only indirection so `enqueueOrgDomainSignalWorkflowRun` can resolve the
 * workflow without putting Workflow DevKit entrypoints on feature barrels.
 */
export { orgDomainSignalWorkflow } from "./org-domain-signal.workflow"
