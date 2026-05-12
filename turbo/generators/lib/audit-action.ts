/**
 * Audit-action helpers for generator templates.
 *
 * Re-imports `CRUD_SAP_VERBS` from `lib/erp/crud-sap.shared.ts` so generators
 * never duplicate the canonical verb enum. Generator prompts present the
 * list, template helpers compose the final `erp.<module>.<object>.<verb>`
 * string via `buildCrudSapAuditAction` at generate-time.
 *
 * Stays a thin wrapper — no business logic, no transforms beyond CRUD-SAP.
 */
import {
  CRUD_SAP_VERBS,
  buildCrudSapAuditAction,
  type CrudSapVerb,
} from "../../../lib/erp/crud-sap.shared"

/** Prompt-friendly choices for Plop `list` prompts (`name` + `value`). */
export const CRUD_SAP_VERB_CHOICES: ReadonlyArray<{
  name: string
  value: CrudSapVerb
}> = CRUD_SAP_VERBS.map((verb) => ({
  name: verb,
  value: verb,
}))

/** Plain array of verbs (Plop sometimes accepts strings instead of choice objects). */
export const CRUD_SAP_VERB_NAMES: ReadonlyArray<CrudSapVerb> = CRUD_SAP_VERBS

/**
 * Build a stable `erp.<module>.<object>.<verb>` audit action string for
 * generator templates. Same contract as the shared builder; reusable from
 * Handlebars helpers so templates emit the canonical string instead of
 * constructing it by hand.
 */
export function buildErpAuditActionString(args: {
  module: string
  object: string
  verb: CrudSapVerb
}): string {
  return buildCrudSapAuditAction({
    area: "erp",
    module: args.module,
    object: args.object,
    verb: args.verb,
  })
}

/** Human-friendly capitalized verb (e.g. "create" → "Create") for Server Action names. */
export function pascalVerb(verb: string): string {
  return verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase()
}
