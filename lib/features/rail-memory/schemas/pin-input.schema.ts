import { z } from "zod"

import { WORKBENCH_IDS } from "../constants"

/**
 * Server-side trust boundary for pin / unpin / reorder Server Action
 * inputs. Form state arrives as `FormData` strings; these schemas
 * normalize + validate before the action proceeds, and the parsed
 * shape is what the audit metadata + DB writer consume.
 *
 * Doctrine — every field that crosses the action boundary lives here,
 * not inline inside the action file. Two reasons:
 *
 *   1. **Reusable in tests.** Unit tests assert the parser rejects
 *      invalid input without needing a `requireOrgSession` mock.
 *
 *   2. **One trust boundary per action category.** When the kernel
 *      rail schema rev-bumps `workbenchRailPinSchema`, this file is
 *      the *one* place to extend the writer-side contract.
 */

const workbenchIdSchema = z.enum(WORKBENCH_IDS)

const labelSchema = z.string().trim().min(1).max(160)
const hrefSchema = z.string().trim().min(1).max(2048)
const idSchema = z.string().trim().min(1).max(128)
const resourceTypeSchema = z.string().trim().min(1).max(64)
const iconSchema = z.string().trim().min(1).max(64).optional()

/**
 * Application-layer enum for pin lane buckets.
 * Stored as free-form text at the DB layer — the closed set is enforced here.
 */
export const PIN_LANE_VALUES = ["pinned", "urgent", "todo"] as const
export type PinLane = (typeof PIN_LANE_VALUES)[number]
const laneSchema = z.enum(PIN_LANE_VALUES).default("pinned").optional()

export const pinRecordInputSchema = z
  .object({
    workbenchId: workbenchIdSchema,
    resourceType: resourceTypeSchema,
    resourceId: idSchema,
    label: labelSchema,
    href: hrefSchema,
    icon: iconSchema,
    lane: laneSchema,
  })
  .strict()

export type PinRecordInput = z.infer<typeof pinRecordInputSchema>

/** Move an existing pin to a different lane without touching other fields. */
export const changePinLaneInputSchema = z
  .object({
    pinId: idSchema,
    lane: z.enum(PIN_LANE_VALUES),
  })
  .strict()

export type ChangePinLaneInput = z.infer<typeof changePinLaneInputSchema>

export const unpinRecordInputSchema = z
  .object({
    pinId: idSchema,
  })
  .strict()

export type UnpinRecordInput = z.infer<typeof unpinRecordInputSchema>

/**
 * Reorder accepts the FULL ordered list of pin ids inside a single
 * workbench. The action enforces (a) every id belongs to the caller's
 * (org, user, workbench) tuple and (b) the input is a permutation of
 * the existing pins for that workbench — partial reorders are
 * rejected to keep `rank` collisions impossible.
 */
export const reorderPinsInputSchema = z
  .object({
    workbenchId: workbenchIdSchema,
    orderedPinIds: z.array(idSchema).min(1).max(64),
  })
  .strict()

export type ReorderPinsInput = z.infer<typeof reorderPinsInputSchema>
