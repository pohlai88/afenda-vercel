import "server-only"

import {
  onethingImportRowSchema,
  type OneThingImportRow,
} from "#features/onething"

import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  AdapterParseErr,
  AdapterParseOk,
  OrgImportAdapter,
} from "./import-adapter.server"

export const onethingImportAdapter: OrgImportAdapter<OneThingImportRow> = {
  id: "onething_import",
  requiredHeaders: ["title"],

  parseRow(
    record: Record<string, string>
  ): AdapterParseOk<OneThingImportRow> | AdapterParseErr {
    const result = onethingImportRowSchema.safeParse({
      title: record.title,
      description: record.description || "",
      priority: record.priority || undefined,
      due_at: record.due_at || "",
      list_slug: record.list_slug || "",
      assignee_email: record.assignee_email || "",
    })
    if (!result.success) {
      const issue = result.error.issues[0]
      const field = issue?.path[0]
      return {
        ok: false,
        code: "validation",
        error: issue?.message ?? "Invalid row",
        field: typeof field === "string" ? field : undefined,
      }
    }
    return { ok: true, payload: result.data }
  },

  async applyRow(
    ctx: AdapterApplyCtx,
    payload: OneThingImportRow
  ): Promise<AdapterApplyOk | AdapterApplyErr> {
    try {
      const { applyOneThingImportRowFromAdapter } =
        await import("#features/onething")
      return await applyOneThingImportRowFromAdapter(ctx, {
        title: payload.title,
        consequence: payload.consequence,
        severity: payload.severity,
        due_at: payload.due_at || undefined,
        list_slug: payload.list_slug || undefined,
        assignee_email: payload.assignee_email || undefined,
      })
    } catch (err) {
      return {
        ok: false,
        code: "unknown",
        message: err instanceof Error ? err.message : "OneThing import failed",
      }
    }
  },
}
