"use server"

import { createHash } from "node:crypto"

import { generateObject } from "ai"
import { sql } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import {
  LYNX_NL_DEMO_TODO_TABLE,
  validateLynxNlDemoSql,
} from "../data/nl-sql-demo-guard.shared"
import { buildLynxTodoNlDemoGenerateSqlSystemPrompt } from "../data/todo-nl-demo-prompt.server"
import {
  resolveLynxTruthStreamModel,
  resolveLynxTruthStreamProviderOptions,
} from "../data/truth-generation-model.server"
import { LYNX_AUDIT_ACTIONS } from "../lynx.contract"
import {
  lynxNlDemoGeneratedSqlSchema,
  lynxNlDemoQuestionSchema,
  type LynxNlDemoResultRow,
} from "../schemas/nl-sql-demo.schema"

function normalizeExecuteRows(result: unknown): LynxNlDemoResultRow[] {
  const rowsUnknown = Array.isArray(result)
    ? result
    : result &&
        typeof result === "object" &&
        "rows" in result &&
        Array.isArray((result as { rows: unknown }).rows)
      ? (result as { rows: unknown[] }).rows
      : []

  return rowsUnknown.map((row) => {
    const r = row as Record<string, unknown>
    const out: LynxNlDemoResultRow = {}
    for (const [k, v] of Object.entries(r)) {
      if (v === null || v === undefined) {
        out[k] = null
      } else if (typeof v === "number" || typeof v === "string") {
        out[k] = v
      } else if (v instanceof Date) {
        out[k] = v.toISOString()
      } else {
        out[k] = String(v)
      }
    }
    return out
  })
}

export async function generateLynxTodoNlDemoSqlAction(
  question: string
): Promise<{ ok: true; sql: string } | { ok: false; error: string }> {
  const org = await requireOrgSession()
  const parsedQ = lynxNlDemoQuestionSchema.safeParse({ question })
  if (!parsedQ.success) {
    return { ok: false, error: "Invalid question" }
  }

  const model = resolveLynxTruthStreamModel()
  if (!model) {
    return {
      ok: false,
      error:
        "Could not resolve a language model (set OPENAI_API_KEY or AI_GATEWAY_API_KEY)",
    }
  }

  const gatewayOpts = resolveLynxTruthStreamProviderOptions()

  try {
    const { object } = await generateObject({
      model,
      schema: lynxNlDemoGeneratedSqlSchema,
      system: buildLynxTodoNlDemoGenerateSqlSystemPrompt(org.organizationId),
      prompt: `Generate the SQL necessary to answer: ${parsedQ.data.question}`,
      ...(gatewayOpts ? { providerOptions: gatewayOpts } : {}),
    })
    return { ok: true, sql: object.query }
  } catch (err) {
    logUnexpectedServerError("lynx_todo_nl_demo_generate_sql_failed", err, {
      scope: "action.lynx.nl_sql_demo.todo",
      "erp.module": "lynx",
      organizationId: org.organizationId,
    })
    return { ok: false, error: "Could not generate SQL" }
  }
}

export async function executeLynxTodoNlDemoSqlAction(
  sqlQuery: string
): Promise<
  | { ok: true; rows: LynxNlDemoResultRow[]; columns: string[] }
  | { ok: false; error: string }
> {
  const org = await requireOrgSession()
  const validated = validateLynxNlDemoSql(
    sqlQuery,
    org.organizationId,
    LYNX_NL_DEMO_TODO_TABLE
  )
  if (!validated.ok) {
    return { ok: false, error: validated.error }
  }

  try {
    const result = await db.execute(sql.raw(validated.sql))
    const rows = normalizeExecuteRows(result)
    const columns =
      rows.length > 0
        ? Object.keys(rows[0]!).sort((a, b) => a.localeCompare(b))
        : []

    const sqlDigest = createHash("sha256")
      .update(validated.sql, "utf8")
      .digest("hex")

    void writeIamAuditEventFromNextHeaders({
      action: LYNX_AUDIT_ACTIONS.nlDemoQuery,
      organizationId: org.organizationId,
      actorUserId: org.userId,
      actorSessionId: org.sessionId,
      resourceType: "lynx.nl_demo.todo",
      resourceId: sqlDigest,
      metadata: {
        rowCount: rows.length,
        table: LYNX_NL_DEMO_TODO_TABLE,
      },
    })

    return { ok: true, rows, columns }
  } catch (err) {
    logUnexpectedServerError("lynx_todo_nl_demo_execute_sql_failed", err, {
      scope: "action.lynx.nl_sql_demo.todo",
      "erp.module": "lynx",
      organizationId: org.organizationId,
    })
    const message = err instanceof Error ? err.message : "Query failed"
    return { ok: false, error: message }
  }
}
