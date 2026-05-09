import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { oneThing, oneThingList } from "#lib/db/schema"
import { neonAuthMember, neonAuthUser } from "#lib/db/schema-neon-auth"

import { ONETHING_DEFAULT_LIST_SLUG, type OneThingSeverity } from "../constants"

import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
} from "#features/org-admin/server"

export type OneThingImportRowPayload = {
  title: string
  consequence?: string
  severity?: OneThingSeverity
  due_at?: string
  list_slug?: string
  assignee_email?: string
}

/**
 * Called from the org-admin `onething_import` CSV adapter (`#features/onething` public export).
 */
export async function applyOneThingImportRowFromAdapter(
  ctx: AdapterApplyCtx,
  payload: OneThingImportRowPayload
): Promise<AdapterApplyOk | AdapterApplyErr> {
  const slug = (
    payload.list_slug?.trim() || ONETHING_DEFAULT_LIST_SLUG
  ).toLowerCase()

  const [list] = await db
    .select({ id: oneThingList.id })
    .from(oneThingList)
    .where(
      and(
        eq(oneThingList.organizationId, ctx.organizationId),
        eq(oneThingList.slug, slug),
        sql`${oneThingList.archivedAt} IS NULL`
      )
    )
    .limit(1)

  if (!list) {
    return {
      ok: false,
      code: "validation",
      message: `Unknown list slug "${slug}"`,
      field: "list_slug",
    }
  }

  let assigneeUserId: string | null = null
  const email = payload.assignee_email?.trim().toLowerCase()
  if (email) {
    const [member] = await db
      .select({ userId: neonAuthMember.userId })
      .from(neonAuthMember)
      .innerJoin(neonAuthUser, eq(neonAuthMember.userId, neonAuthUser.id))
      .where(
        and(
          eq(neonAuthMember.organizationId, ctx.organizationId),
          eq(neonAuthUser.email, email)
        )
      )
      .limit(1)

    if (!member) {
      return {
        ok: false,
        code: "validation",
        message: `No member with email ${email}`,
        field: "assignee_email",
      }
    }
    assigneeUserId = member.userId
  }

  const severity = payload.severity ?? "medium"
  let dueAt: Date | null = null
  if (payload.due_at?.trim()) {
    const d = new Date(payload.due_at.trim())
    if (Number.isNaN(d.getTime())) {
      return {
        ok: false,
        code: "validation",
        message: "Invalid due_at",
        field: "due_at",
      }
    }
    dueAt = d
  }

  const [row] = await db
    .insert(oneThing)
    .values({
      listId: list.id,
      organizationId: ctx.organizationId,
      ownerUserId: null,
      title: payload.title.trim(),
      consequence: (payload.consequence ?? "").trim(),
      severity,
      dueAt,
      assigneeUserId,
      state: assigneeUserId ? "owned" : "detected",
      provenance: { kind: "import", source: "org-admin.csv" },
    })
    .returning({ id: oneThing.id })

  if (!row) throw new Error("onething insert returned no row")

  return {
    ok: true,
    resourceType: "onething",
    resourceId: row.id,
  }
}
