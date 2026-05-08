"use server"

import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { db } from "#lib/db"
import { erpTodo } from "#lib/db/schema"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgDashboardRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import { and, eq, inArray } from "drizzle-orm"
import type { Route } from "next"

export async function purgeCompletedOrgTodos(
  formData: FormData
): Promise<void> {
  const session = await requireOrgSession()
  const resumePath = String(
    formData.get("resumePath") ?? "/o/placeholder/dashboard/todos"
  )
  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, resumePath as Route) as unknown as string,
  })

  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return

  const deleted = await db
    .delete(erpTodo)
    .where(
      and(
        eq(erpTodo.organizationId, session.organizationId),
        inArray(erpTodo.state, ["completed", "cancelled"])
      )
    )
    .returning({ id: erpTodo.id })

  void writeIamAuditEventFromNextHeaders({
    action: "erp.todo.task.delete",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "todo.task",
    resourceId: "bulk",
    metadata: { purged: deleted.length },
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )
}
