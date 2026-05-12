import { z } from "zod"

import {
  PLANNER_DISPLAY_PRIORITIES,
  PLANNER_OWNERSHIP_ROLES,
  PLANNER_SIGNAL_CLASSES,
} from "../constants"
import { PLANNER_AUTOMATION_ATTENTION_KINDS } from "../automation/planner-automation-attention.shared"

const plannerUuidArrayField = z.array(z.string().uuid()).max(20).optional()
const plannerStringArrayField = z
  .array(z.string().trim().min(1))
  .max(20)
  .optional()

export const plannerViewFilterStateSchema = z
  .object({
    query: z.string().trim().max(200).optional(),
    lifecycle: plannerStringArrayField,
    ownerUserIds: plannerUuidArrayField,
    assignmentRole: z.array(z.enum(PLANNER_OWNERSHIP_ROLES)).max(20).optional(),
    automationState: z
      .array(z.enum(["attention"]))
      .max(20)
      .optional(),
    automationKind: z
      .array(z.enum(PLANNER_AUTOMATION_ATTENTION_KINDS))
      .max(20)
      .optional(),
    signalClass: z.array(z.enum(PLANNER_SIGNAL_CLASSES)).max(20).optional(),
    displayPriority: z
      .array(z.enum(PLANNER_DISPLAY_PRIORITIES))
      .max(20)
      .optional(),
    linkedModule: plannerStringArrayField,
  })
  .strict()

export type PlannerViewFilterState = z.infer<
  typeof plannerViewFilterStateSchema
>

type SearchParamValue = string | string[] | undefined

function toArray(value: SearchParamValue): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

export function parsePlannerViewFilterState(raw: unknown) {
  const parsed = plannerViewFilterStateSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function normalizePlannerViewFilterState(
  raw: unknown
): PlannerViewFilterState {
  const parsed = parsePlannerViewFilterState(raw)
  if (!parsed) return {}

  const next: PlannerViewFilterState = {}

  if (parsed.query) next.query = parsed.query
  if (parsed.lifecycle?.length) next.lifecycle = [...parsed.lifecycle]
  if (parsed.ownerUserIds?.length) next.ownerUserIds = [...parsed.ownerUserIds]
  if (parsed.assignmentRole?.length) {
    next.assignmentRole = [...parsed.assignmentRole]
  }
  if (parsed.automationState?.length) {
    next.automationState = [...parsed.automationState]
  }
  if (parsed.automationKind?.length) {
    next.automationKind = [...parsed.automationKind]
  }
  if (parsed.signalClass?.length) next.signalClass = [...parsed.signalClass]
  if (parsed.displayPriority?.length) {
    next.displayPriority = [...parsed.displayPriority]
  }
  if (parsed.linkedModule?.length) next.linkedModule = [...parsed.linkedModule]

  return next
}

export function mergePlannerViewFilterStates(
  ...states: Array<PlannerViewFilterState | null | undefined>
): PlannerViewFilterState {
  const merged: PlannerViewFilterState = {}

  for (const state of states) {
    if (!state) continue
    if (state.query) merged.query = state.query
    if (state.lifecycle?.length) merged.lifecycle = [...state.lifecycle]
    if (state.ownerUserIds?.length)
      merged.ownerUserIds = [...state.ownerUserIds]
    if (state.assignmentRole?.length) {
      merged.assignmentRole = [...state.assignmentRole]
    }
    if (state.automationState?.length) {
      merged.automationState = [...state.automationState]
    }
    if (state.automationKind?.length) {
      merged.automationKind = [...state.automationKind]
    }
    if (state.signalClass?.length) merged.signalClass = [...state.signalClass]
    if (state.displayPriority?.length) {
      merged.displayPriority = [...state.displayPriority]
    }
    if (state.linkedModule?.length)
      merged.linkedModule = [...state.linkedModule]
  }

  return merged
}

export function parsePlannerViewFilterSearchParams(input: {
  q?: SearchParamValue
  lifecycle?: SearchParamValue
  ownerUserIds?: SearchParamValue
  assignmentRole?: SearchParamValue
  automationState?: SearchParamValue
  automationKind?: SearchParamValue
  signalClass?: SearchParamValue
  displayPriority?: SearchParamValue
  linkedModule?: SearchParamValue
}): PlannerViewFilterState {
  return normalizePlannerViewFilterState({
    query: typeof input.q === "string" ? input.q : undefined,
    lifecycle: toArray(input.lifecycle),
    ownerUserIds: toArray(input.ownerUserIds),
    assignmentRole: toArray(input.assignmentRole),
    automationState: toArray(input.automationState),
    automationKind: toArray(input.automationKind),
    signalClass: toArray(input.signalClass),
    displayPriority: toArray(input.displayPriority),
    linkedModule: toArray(input.linkedModule),
  })
}

export function serializePlannerViewFilterState(
  state: PlannerViewFilterState
): string {
  return JSON.stringify(normalizePlannerViewFilterState(state))
}
