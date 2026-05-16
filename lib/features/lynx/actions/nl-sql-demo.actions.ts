"use server"

import { createHash } from "node:crypto"

import { generateObject } from "ai"
import { sql } from "drizzle-orm"

import {
  buildLynxNlDemoExplainSqlSystemPrompt,
  buildLynxNlDemoGenerateSqlSystemPrompt,
} from "../data/nl-sql-demo-prompt.server"
import { validateLynxNlDemoSql } from "../data/nl-sql-demo-guard.shared"
import {
  resolveLynxTruthStreamModel,
  resolveLynxTruthStreamProviderOptions,
} from "../data/truth-generation-model.server"
import { LYNX_AUDIT_ACTIONS } from "../lynx.contract"
import {
  lynxNlDemoChartConfigSchema,
  lynxNlDemoExplanationsSchema,
  lynxNlDemoGeneratedSqlSchema,
  lynxNlDemoQuestionSchema,
  type LynxNlDemoChartConfig,
  type LynxNlDemoResultRow,
} from "../schemas/nl-sql-demo.schema"
import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"
import { z } from "zod"

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
        out[k] = v.toISOString().slice(0, 10)
      } else {
        out[k] = String(v)
      }
    }
    return out
  })
}

export async function generateLynxNlDemoSqlAction(
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
        "Could not resolve a language model (AI Gateway credentials missing)",
    }
  }

  const gatewayOpts = resolveLynxTruthStreamProviderOptions()

  try {
    const { object } = await generateObject({
      model,
      schema: lynxNlDemoGeneratedSqlSchema,
      system: buildLynxNlDemoGenerateSqlSystemPrompt(org.organizationId),
      prompt: `Generate the SQL necessary to answer: ${parsedQ.data.question}`,
      ...(gatewayOpts ? { providerOptions: gatewayOpts } : {}),
    })
    return { ok: true, sql: object.query }
  } catch (err) {
    logUnexpectedServerError("lynx_nl_demo_generate_sql_failed", err, {
      scope: "action.lynx.nl_sql_demo",
      "erp.module": "lynx",
      organizationId: org.organizationId,
    })
    return { ok: false, error: "Could not generate SQL" }
  }
}

export async function executeLynxNlDemoSqlAction(
  sqlQuery: string
): Promise<
  | { ok: true; rows: LynxNlDemoResultRow[]; columns: string[] }
  | { ok: false; error: string }
> {
  const org = await requireOrgSession()
  const validated = validateLynxNlDemoSql(sqlQuery, org.organizationId)
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

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: LYNX_AUDIT_ACTIONS.nlDemoQuery,
        organizationId: org.organizationId,
        actorUserId: org.userId,
        actorSessionId: org.sessionId,
        resourceType: "lynx.nl_demo",
        resourceId: sqlDigest,
        metadata: {
          rowCount: rows.length,
        },
      })
    )

    return { ok: true, rows, columns }
  } catch (err) {
    logUnexpectedServerError("lynx_nl_demo_execute_sql_failed", err, {
      scope: "action.lynx.nl_sql_demo",
      "erp.module": "lynx",
      organizationId: org.organizationId,
    })
    const message = err instanceof Error ? err.message : "Query failed"
    return { ok: false, error: message }
  }
}

export async function explainLynxNlDemoSqlAction(
  question: string,
  sqlQuery: string
): Promise<
  | { ok: true; explanations: z.infer<typeof lynxNlDemoExplanationsSchema> }
  | {
      ok: false
      error: string
    }
> {
  const org = await requireOrgSession()
  const parsedQ = lynxNlDemoQuestionSchema.safeParse({ question })
  if (!parsedQ.success) {
    return { ok: false, error: "Invalid question" }
  }
  if (!sqlQuery.trim()) {
    return { ok: false, error: "Missing SQL" }
  }

  const model = resolveLynxTruthStreamModel()
  if (!model) {
    return {
      ok: false,
      error:
        "Could not resolve a language model (AI Gateway credentials missing)",
    }
  }

  const gatewayOpts = resolveLynxTruthStreamProviderOptions()
  const explainSchema = z.object({
    explanations: lynxNlDemoExplanationsSchema,
  })

  try {
    const { object } = await generateObject({
      model,
      schema: explainSchema,
      system: buildLynxNlDemoExplainSqlSystemPrompt(),
      prompt: `User question:\n${parsedQ.data.question}\n\nSQL:\n${sqlQuery}`,
      ...(gatewayOpts ? { providerOptions: gatewayOpts } : {}),
    })
    return { ok: true, explanations: object.explanations }
  } catch (err) {
    logUnexpectedServerError("lynx_nl_demo_explain_sql_failed", err, {
      scope: "action.lynx.nl_sql_demo",
      "erp.module": "lynx",
      organizationId: org.organizationId,
    })
    return { ok: false, error: "Could not explain SQL" }
  }
}

export async function suggestLynxNlDemoChartAction(
  userQuery: string,
  results: LynxNlDemoResultRow[]
): Promise<
  { ok: true; config: LynxNlDemoChartConfig } | { ok: false; error: string }
> {
  const org = await requireOrgSession()
  const parsedQ = lynxNlDemoQuestionSchema.safeParse({ question: userQuery })
  if (!parsedQ.success) {
    return { ok: false, error: "Invalid question" }
  }
  if (results.length === 0) {
    return { ok: false, error: "No rows to chart" }
  }

  const model = resolveLynxTruthStreamModel()
  if (!model) {
    return {
      ok: false,
      error:
        "Could not resolve a language model (AI Gateway credentials missing)",
    }
  }

  const gatewayOpts = resolveLynxTruthStreamProviderOptions()

  try {
    const { object: config } = await generateObject({
      model,
      schema: lynxNlDemoChartConfigSchema,
      system: `You are Lynx — choose a Recharts-friendly layout.`,
      prompt: `Given SQL result rows, propose chart config for the user's question.
Prefer bar for comparisons, line for time series, pie for parts-of-whole.

User question:
${parsedQ.data.question}

Data (JSON):
${JSON.stringify(results.slice(0, 40), null, 2)}`,
      ...(gatewayOpts ? { providerOptions: gatewayOpts } : {}),
    })

    const colors: Record<string, string> = {}
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${(index % 5) + 1}))`
    })

    const merged: LynxNlDemoChartConfig = { ...config, colors }
    return { ok: true, config: merged }
  } catch (err) {
    logUnexpectedServerError("lynx_nl_demo_suggest_chart_failed", err, {
      scope: "action.lynx.nl_sql_demo",
      "erp.module": "lynx",
      organizationId: org.organizationId,
    })
    return { ok: false, error: "Could not suggest chart" }
  }
}
