/**
 * Server-only indirection so `enqueueHrmSignatureSealWorkflowRun` can resolve the
 * workflow without putting Workflow DevKit entrypoints on `#features/hrm` barrels.
 */
export { hrmSignatureSealWorkflow } from "../../tools/electronic-signatures/data/hrm-signature-seal.workflow"
