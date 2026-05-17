/**
 * Dev-only assertion helper for governed surface builders.
 *
 * Builders declare their return type as `<Schema>ConfigurationInput`
 * (enforced by `afenda/governed-surface-builder-return` in
 * `eslint.config.mjs`). The input type intentionally allows default-bearing
 * fields to be omitted, which means a builder can produce an object that
 * passes TypeScript but fails the Zod schema's `superRefine` constraints
 * (e.g. KPI stat-card with > 4 tiles, list-surface with duplicate column
 * ids, audit-panel with duplicate row ids).
 *
 * `assertGovernedSurfaceInput` parses a builder's output against the schema
 * and throws in dev / test, returning the validated output type. Use it
 * from preview pages or unit tests — NEVER from production server actions
 * (those already validate input separately, and a throw at render time
 * crashes the server component).
 *
 * Pattern:
 *
 *   const stats = assertGovernedSurfaceInput(
 *     statCardConfigurationSchema,
 *     buildPayslipSummaryStats(snapshot),
 *     "payslip-summary",
 *   )
 *
 * On failure the assertion message names the builder context and the first
 * Zod issue so preview pages fail loudly during local dev.
 */
import type { z } from "zod"

export type GovernedSurfaceInputAssertionError = Error & {
  readonly issuesJson: string
  readonly builderContext: string
}

function buildAssertionError(
  builderContext: string,
  issuesJson: string
): GovernedSurfaceInputAssertionError {
  const error = new Error(
    `governed surface assertion failed for "${builderContext}":\n${issuesJson}`
  )
  // Attach for runtime inspection in dev panels / preview routes.
  return Object.assign(error, {
    issuesJson,
    builderContext,
  })
}

/**
 * Validates a builder result against its Zod schema, throwing on failure.
 *
 * The function returns the schema's **output** type (defaults applied,
 * `.superRefine` checks passed). Callers can pass the result directly to a
 * renderer without re-parsing.
 *
 * @throws {@link GovernedSurfaceInputAssertionError} when validation fails.
 *         The error carries the originating builder context and the
 *         serialised Zod issue tree.
 */
export function assertGovernedSurfaceInput<Schema extends z.ZodTypeAny>(
  schema: Schema,
  candidate: z.input<Schema>,
  builderContext: string
): z.output<Schema> {
  const parsed = schema.safeParse(candidate)
  if (parsed.success) {
    return parsed.data
  }
  throw buildAssertionError(
    builderContext,
    JSON.stringify(parsed.error.issues, null, 2)
  )
}

/**
 * Soft variant — returns either a typed success envelope or the issues list
 * without throwing. Useful from preview pages that want to render a
 * developer-facing error UI instead of crashing the Server Component.
 */
export type GovernedSurfaceInputAssertion<Schema extends z.ZodTypeAny> =
  | { readonly ok: true; readonly data: z.output<Schema> }
  | {
      readonly ok: false
      readonly builderContext: string
      readonly issues: readonly z.core.$ZodIssue[]
    }

export function tryGovernedSurfaceInput<Schema extends z.ZodTypeAny>(
  schema: Schema,
  candidate: z.input<Schema>,
  builderContext: string
): GovernedSurfaceInputAssertion<Schema> {
  const parsed = schema.safeParse(candidate)
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  return {
    ok: false,
    builderContext,
    issues: parsed.error.issues,
  }
}
