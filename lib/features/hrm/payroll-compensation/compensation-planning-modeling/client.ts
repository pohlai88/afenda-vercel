export {
  HRM_COMPENSATION_COMPONENT_CODES,
  HRM_ALLOWANCE_AMOUNT_DECIMAL_RE,
  hrmCompensationSnapshotEntrySchema,
  hrmCompensationSnapshotSchema,
  hrmContractAnnexSlotsSchema,
  parseAllowanceLineInputsFromForm,
  tryBuildAnnexSlotsFromForm,
} from "./schema/contract-compensation.shared"

export type {
  HrmCompensationComponentCode,
  HrmCompensationSnapshotEntry,
  HrmContractAnnexSlot,
  HrmAllowanceLineFormParsed,
} from "./schema/contract-compensation.shared"
