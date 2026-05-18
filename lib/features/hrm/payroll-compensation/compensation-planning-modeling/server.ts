import "server-only"

export {
  listCompensationComponentsForOrg,
  buildCompensationSnapshotForContract,
  listContractAllowancesForEngine,
  listCompensationLineSummariesForContracts,
  parseStoredAnnexSlots,
  parseStoredCompensationSnapshot,
} from "./data/compensation.queries.server"

export {
  ensureDefaultHrmCompensationComponents,
  insertContractCompensationLines,
  copyContractCompensationLines,
} from "./data/compensation.mutations.server"

export type {
  HrmCompensationComponentRow,
  ContractCompensationLineSummary,
  HrmCompensationQueryClient,
} from "./data/compensation.queries.server"

export type {
  HrmCompensationDbClient,
  ContractCompensationLineInput,
} from "./data/compensation.mutations.server"

export {
  parseAllowanceLineInputsFromForm,
  tryBuildAnnexSlotsFromForm,
} from "./schema/contract-compensation.shared"
