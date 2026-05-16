/**
 * Server-only indirection so `enqueueHrmSignatureSealWorkflowRun` can resolve the
 * workflow without putting Workflow DevKit entrypoints on `#features/hrm` barrels.
 */
export { hrmSignatureSealWorkflow } from "../../hrm/data/hrm-signature-seal.workflow"
