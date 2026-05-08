import "server-only"

import { todoImportRowSchema, type TodoImportRow } from "#features/todos"

import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  AdapterParseErr,
  AdapterParseOk,
  OrgImportAdapter,
} from "./import-adapter.server"

export const todoImportAdapter: OrgImportAdapter<TodoImportRow> = {
  id: "todo_import",
  requiredHeaders: ["title"],

  parseRow(
    record: Record<string, string>
  ): AdapterParseOk<TodoImportRow> | AdapterParseErr {
    const result = todoImportRowSchema.safeParse({
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
    payload: TodoImportRow
  ): Promise<AdapterApplyOk | AdapterApplyErr> {
    try {
      const { applyTodoImportRowFromAdapter } = await import("#features/todos")
      return await applyTodoImportRowFromAdapter(ctx, {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        due_at: payload.due_at || undefined,
        list_slug: payload.list_slug || undefined,
        assignee_email: payload.assignee_email || undefined,
      })
    } catch (err) {
      return {
        ok: false,
        code: "unknown",
        message: err instanceof Error ? err.message : "Todo import failed",
      }
    }
  },
}
