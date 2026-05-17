/**
 * Server-only indirection so `enqueuePayrollFinalizeWorkflowRun` can resolve the
 * workflow without putting Workflow DevKit entrypoints on `#features/hrm` barrels.
 */
export { payrollFinalizeWorkflow } from "../../hrm/payroll-compensation/payroll-processing/data/payroll-finalize.workflow"
