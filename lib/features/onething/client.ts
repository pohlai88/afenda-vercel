/**
 * Client-safe OneThing surface: types, pure schema helpers, and Server Actions
 * bound for client islands. Canvas / tail / decision-console import here — not
 * `#features/onething` — so Turbopack does not pull the full server barrel.
 */
export { addOrgOneThingComment } from "./actions/add-org-onething-comment"
export { rotateOneThingListShareToken } from "./actions/rotate-onething-list-share-token"
export { completeOrgOneThing } from "./actions/complete-org-onething"
export { completePersonalOneThing } from "./actions/complete-personal-onething"
export { createOrgOneThing } from "./actions/create-org-onething"
export { createPersonalOneThing } from "./actions/create-personal-onething"
export { deleteOrgOneThing } from "./actions/delete-org-onething"
export { deletePersonalOneThing } from "./actions/delete-personal-onething"
export { deprecateOrgOneThing } from "./actions/deprecate-org-onething"
export { deprecatePersonalOneThing } from "./actions/deprecate-personal-onething"
export { purgeResolvedOrgOneThing } from "./actions/purge-resolved-org-onething"
export { reopenOrgOneThing } from "./actions/reopen-org-onething"
export { resolveOrgOneThing } from "./actions/resolve-org-onething"
export { resolvePersonalOneThing } from "./actions/resolve-personal-onething"
export { snoozeOrgOneThingOneHour } from "./actions/snooze-org-onething"

export type {
  CreateOrgOneThingFormState,
  DeprecateOneThingActionResult,
  OneThingCounterparty,
  OneThingLinkageEntityRef,
  OneThingRow,
  ResolveOneThingActionResult,
} from "./types"

export type { RankedOneThing } from "./data/onething-rank.shared"

export type { OneThingTailPreserveSearchParams } from "./data/onething-page-view.shared"
export { buildTailFocusHref } from "./data/onething-page-view.shared"

export type {
  Prediction,
  ResolveSeverity,
} from "./schemas/onething-onething.schema"

export {
  inferResolveSeverityFromSignals,
  safeParsePredictions,
} from "./schemas/onething-onething.schema"

export {
  classifyOneThingTitleIssue,
  ONETHING_TITLE_NOT_SITUATION_CODE,
  type OneThingTitleQualityIssue,
} from "./schemas/onething.schema"

export { clearOneThingClientStorage } from "./components/onething-client-storage"

export { pickNextRankedId } from "./components/hooks/pick-next-ranked-id.shared"
export { splitOneThingDraft } from "./components/hooks/split-onething-draft.shared"
export {
  formatAmbientTime,
  HOUR_MS,
  DAY_MS,
  type AmbientTimeT,
} from "./components/hooks/ambient-time.shared"
