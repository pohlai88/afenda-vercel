import { z } from "zod"

import { APP_SHELL_PRIMARY_LEFT_RAIL_FORBIDDEN_LABEL_NAMESPACES } from "#app-shell"

import { WORKBENCH_IDS } from "../constants"

/**
 * Server-side trust boundary for `recordRecentVisit`.
 *
 * Important: `recordRecentVisit` is **not** a Server Action — it is a
 * server-only function callers invoke from RSC pages. The Zod schema
 * still exists because (a) the function takes an unknown-shaped input
 * from many call sites that all need the same validation, and (b) the
 * unit tests for the writer assert via this schema.
 *
 * `resourceId` is OPTIONAL — list-level surfaces (e.g. "Members"
 * index page) have a stable href but no record id. The writer handles
 * the rate-limit lookup by treating absent `resourceId` as a sentinel
 * keyed off `(workbenchId, resourceType, href)`.
 *
 * The `label` field carries the same audit-namespace refinement as the
 * kernel `appShellPrimaryLeftRailRecentSchema` — recents are continuity memory,
 * not audit logs. Defense in depth: even though RSC callers usually
 * pass surface-derived labels, an opt-in route could mistakenly hand
 * in a raw audit action string (`erp.contact.record.create`). Block at
 * the writer too so the table never holds rows the renderer would
 * subsequently reject.
 */

const workbenchIdSchema = z.enum(WORKBENCH_IDS)

function isAuditNamespaceLabel(value: string): boolean {
  const trimmed = value.trimStart()
  return APP_SHELL_PRIMARY_LEFT_RAIL_FORBIDDEN_LABEL_NAMESPACES.some((prefix) =>
    trimmed.startsWith(`${prefix}.`)
  )
}

const labelSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((value) => !isAuditNamespaceLabel(value), {
    message:
      "Recents carry continuity memory, not audit action strings. " +
      "Use a human label (e.g. 'Aisha Khan · viewed 12m ago').",
  })
const hrefSchema = z.string().trim().min(1).max(2048)
const resourceTypeSchema = z.string().trim().min(1).max(64)
const idSchema = z.string().trim().min(1).max(128)
const iconSchema = z.string().trim().min(1).max(64).optional()

export const recordRecentVisitInputSchema = z
  .object({
    organizationId: idSchema,
    userId: idSchema,
    workbenchId: workbenchIdSchema,
    resourceType: resourceTypeSchema,
    resourceId: idSchema.optional(),
    label: labelSchema,
    href: hrefSchema,
    icon: iconSchema,
  })
  .strict()

export type RecordRecentVisitInput = z.infer<
  typeof recordRecentVisitInputSchema
>
