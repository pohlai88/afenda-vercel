/** Allowed base table for Lynx NL→SQL demo (must match `lib/db/schema.ts`). */
export const LYNX_NL_DEMO_TABLE = "lynx_demo_unicorn" as const

const FORBIDDEN_SQL_PATTERN =
  /\b(delete|insert|update|drop|alter|truncate|create|grant|revoke|merge|copy|into\s+outfile)\b/i

const MULTI_STMT_PATTERN = /;(?![\s]*$)/

export const LYNX_NL_DEMO_ROW_CAP = 200 as const

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Validates model-produced SQL before execution.
 * Defense in depth: SELECT-only, single statement, org filter, allowlisted FROM.
 */
export function validateLynxNlDemoSql(
  rawQuery: string,
  organizationId: string
): { ok: true; sql: string } | { ok: false; error: string } {
  const trimmed = rawQuery.trim()
  if (!trimmed) {
    return { ok: false, error: "Empty SQL" }
  }

  if (MULTI_STMT_PATTERN.test(trimmed)) {
    return { ok: false, error: "Multiple SQL statements are not allowed" }
  }

  const core = trimmed.replace(/;+\s*$/g, "").trim()

  if (/--|\/\*/.test(core)) {
    return { ok: false, error: "SQL comments are not allowed" }
  }

  const lower = core.toLowerCase()
  if (!lower.startsWith("select")) {
    return { ok: false, error: "Only SELECT queries are allowed" }
  }

  if (FORBIDDEN_SQL_PATTERN.test(core)) {
    return { ok: false, error: "Disallowed SQL keyword in query" }
  }

  if (/\bjoin\b/i.test(core)) {
    return { ok: false, error: "JOIN is not allowed for this demo" }
  }

  const fromRe = new RegExp(`\\bfrom\\s+"${LYNX_NL_DEMO_TABLE}"`, "i")
  const fromBareRe = new RegExp(`\\bfrom\\s+${LYNX_NL_DEMO_TABLE}\\b`, "i")
  if (!fromRe.test(core) && !fromBareRe.test(core)) {
    return {
      ok: false,
      error: `Query must read only from "${LYNX_NL_DEMO_TABLE}"`,
    }
  }

  const orgClause = new RegExp(
    `"organizationId"\\s*=\\s*'${escapeRegex(organizationId)}'`,
    "i"
  )
  if (!orgClause.test(core)) {
    return {
      ok: false,
      error:
        "Query must filter rows with \"organizationId\" = '<your org id>' exactly as provided in the system prompt",
    }
  }

  let limited = core
  if (!/\blimit\s+\d+/i.test(limited)) {
    limited = `${limited} LIMIT ${LYNX_NL_DEMO_ROW_CAP}`
  } else {
    const lim = limited.match(/\blimit\s+(\d+)/i)
    const n = lim ? Number(lim[1]) : 0
    if (!Number.isFinite(n) || n < 1 || n > LYNX_NL_DEMO_ROW_CAP) {
      return {
        ok: false,
        error: `LIMIT must be between 1 and ${LYNX_NL_DEMO_ROW_CAP}`,
      }
    }
  }

  return { ok: true, sql: limited }
}
