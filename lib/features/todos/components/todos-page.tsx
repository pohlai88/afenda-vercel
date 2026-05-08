import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { canActInOrganization } from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { ensureDefaultTodoListForOrg } from "../data/todos.mutations.server"
import {
  listTodoListsForOrg,
  listTodosForList,
} from "../data/todos.queries.server"
import { OrgTodoBoard } from "./org-todo-board"

export async function TodosPage() {
  const t = await getTranslations("Dashboard.Todos")
  const org = await requireOrgSession()
  const canAdmin = await canActInOrganization(
    org.userId,
    org.user.role,
    org.organizationId,
    "admin"
  )
  const defaultListId = await ensureDefaultTodoListForOrg(org.organizationId)
  const lists = await listTodoListsForOrg(org.organizationId)
  const todos = await listTodosForList(defaultListId, org.organizationId, null)

  return (
    <div className="space-y-8">
      <ModulePageHeader
        title={t("title")}
        description={t("description")}
        eyebrow="Operations"
      />
      <OrgTodoBoard
        organizationId={org.organizationId}
        defaultListId={defaultListId}
        lists={lists}
        initialTodos={todos}
        canAdmin={canAdmin}
      />
    </div>
  )
}
