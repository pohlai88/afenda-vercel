import { z } from "zod"

/** ISO calendar date only — not valid as a display KPI/snapshot value. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Numeric string with a fractional part and no units — likely raw DB output. */
const RAW_FRACTIONAL_DECIMAL = /^-?\d+\.\d+$/

/** Whole-number string with no symbols — ambiguous for snapshot document figures. */
const RAW_INTEGER = /^-?\d+$/

export function displayStringIssue(
  field: "value" | "delta",
  raw: string,
  dataNature: "kpi" | "snapshot-summary"
): string | undefined {
  const text = raw.trim()
  if (text.length === 0) return undefined

  if (ISO_DATE_ONLY.test(text)) {
    return `${field} must be a formatted display string, not a raw ISO date (${text})`
  }

  if (dataNature === "snapshot-summary") {
    if (RAW_FRACTIONAL_DECIMAL.test(text) || RAW_INTEGER.test(text)) {
      return `${field} must be formatted for display (e.g. currency/labels), not a raw number (${text})`
    }
  }

  if (
    dataNature === "kpi" &&
    field === "value" &&
    RAW_FRACTIONAL_DECIMAL.test(text)
  ) {
    return `${field} should include units or formatting; raw decimal (${text}) is ambiguous for KPI tiles`
  }

  return undefined
}

export function refineStatCardDisplayStrings(
  config: {
    dataNature: "kpi" | "snapshot-summary"
    stats: ReadonlyArray<{ value: string; delta?: string }>
  },
  ctx: z.RefinementCtx
) {
  for (const [index, stat] of config.stats.entries()) {
    const valueIssue = displayStringIssue(
      "value",
      stat.value,
      config.dataNature
    )
    if (valueIssue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stats", index, "value"],
        message: valueIssue,
      })
    }
    if (stat.delta != null) {
      const deltaIssue = displayStringIssue(
        "delta",
        stat.delta,
        config.dataNature
      )
      if (deltaIssue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stats", index, "delta"],
          message: deltaIssue,
        })
      }
    }
  }
}
