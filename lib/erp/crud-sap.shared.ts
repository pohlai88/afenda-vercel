/**
 * @internal
 *
 * **INVISIBILITY — CRUD-SAP is internal operating grammar only.**
 *
 * These verb identifiers exist for IAM audit action strings (`erp.*.*.*`),
 * ranker logic, and developer composition. They MUST NOT surface in user-facing
 * UI: no `Button` labels, page titles, navigation items, or i18n keys at
 * user-facing positions (`*.button`, `*.title`, `*.tab`). Use product-domain
 * copy instead (“Resolve”, “Show history”, “What breaks if I approve this?”).
 */

import { z } from "zod"

export const CRUD_SAP_VERBS = [
  "create",
  "resolve",
  "update",
  "deprecate",
  "search",
  "audit",
  "predict",
] as const

export type CrudSapVerb = (typeof CRUD_SAP_VERBS)[number]

export const crudSapVerbSchema = z.enum(CRUD_SAP_VERBS)

/** Which CRUD-SAP verbs primarily answer Past / Now / Next questions. */
export const CRUD_SAP_TEMPORAL_FOCUS = {
  past: ["search", "audit"],
  now: ["resolve", "update"],
  next: ["predict", "create"],
} as const satisfies Record<"past" | "now" | "next", readonly CrudSapVerb[]>

/** Verbs that retire the object across all temporal layers (not Past/Now/Next). */
export const CRUD_SAP_META_VERBS = ["deprecate"] as const

export const auditAreaSchema = z.enum([
  "erp",
  "org",
  "iam",
  "governance",
  "integration",
  "workflow",
  "system",
])

export type AuditArea = z.infer<typeof auditAreaSchema>

function slugSegment(raw: string, maxLen: number): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
  if (s.length === 0) return ""
  return s.length > maxLen ? s.slice(0, maxLen).replace(/_+$/g, "") : s
}

export function isCrudSapVerb(value: string): value is CrudSapVerb {
  return (CRUD_SAP_VERBS as readonly string[]).includes(value)
}

/** Verbs mapped to a temporal layer; `deprecate` returns `"meta"`. */
export function temporalLayerForCrudSapVerb(
  verb: CrudSapVerb
): "past" | "now" | "next" | "meta" {
  if ((CRUD_SAP_META_VERBS as readonly string[]).includes(verb)) return "meta"
  if ((CRUD_SAP_TEMPORAL_FOCUS.past as readonly string[]).includes(verb))
    return "past"
  if ((CRUD_SAP_TEMPORAL_FOCUS.now as readonly string[]).includes(verb))
    return "now"
  if ((CRUD_SAP_TEMPORAL_FOCUS.next as readonly string[]).includes(verb))
    return "next"
  // Every CrudSapVerb must appear in CRUD_SAP_TEMPORAL_FOCUS or CRUD_SAP_META_VERBS.
  // Reaching here means the verb was added to CRUD_SAP_VERBS without being classified.
  throw new Error(
    `temporalLayerForCrudSapVerb: unclassified verb "${verb}" — add it to CRUD_SAP_TEMPORAL_FOCUS or CRUD_SAP_META_VERBS`
  )
}

/** CRUD-SAP verbs associated with a temporal layer (excludes meta verbs). */
export function crudSapVerbsForTemporalLayer(
  layer: keyof typeof CRUD_SAP_TEMPORAL_FOCUS
): readonly CrudSapVerb[] {
  return CRUD_SAP_TEMPORAL_FOCUS[layer]
}

/**
 * Strict audit-action builder — `verb` must be one of the seven canonical
 * CRUD-SAP verbs. Prefer for new operational objects.
 */
export function buildCrudSapAuditAction(input: {
  area: AuditArea
  module: string
  object: string
  verb: CrudSapVerb
}): string {
  const area = auditAreaSchema.parse(input.area)
  const moduleSlug = slugSegment(input.module, 64)
  const objectSlug = slugSegment(input.object, 64)
  const verb = crudSapVerbSchema.parse(input.verb)
  if (!moduleSlug || !objectSlug) {
    throw new Error(
      "buildCrudSapAuditAction: module and object must be non-empty"
    )
  }
  return `${area}.${moduleSlug}.${objectSlug}.${verb}`
}

/**
 * Permissive audit-action builder for legacy verbs (`post`, `approve`, `query`, …).
 */
export function buildErpAuditAction(input: {
  area: "erp" | "org"
  module: string
  object: string
  verb: string
}): string {
  const area = input.area
  const moduleSlug = slugSegment(input.module, 64)
  const objectSlug = slugSegment(input.object, 64)
  const verbSlug = slugSegment(input.verb, 64)
  if (!moduleSlug || !objectSlug || !verbSlug) {
    throw new Error(
      "buildErpAuditAction: module, object, and verb must be non-empty"
    )
  }
  return `${area}.${moduleSlug}.${objectSlug}.${verbSlug}`
}
