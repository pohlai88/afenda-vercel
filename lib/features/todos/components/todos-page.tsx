import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/dashboard/module-page-header"
import { canActInOrganization } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { addOrgTodoComment } from "../actions/add-org-todo-comment"
import { completeOrgTodo } from "../actions/complete-org-todo"
import { createOrgTodo } from "../actions/create-org-todo"
import { deleteOrgTodo } from "../actions/delete-org-todo"
import { purgeCompletedOrgTodos } from "../actions/purge-completed-org-todos"
import { reopenOrgTodo } from "../actions/reopen-org-todo"
import { snoozeOrgTodoOneHour } from "../actions/snooze-org-todo"
import { rankTodosForCanvas } from "../data/todo-rank.server"
import {
  buildOrgTodoCaptureSeedParts,
  parseTodoCanvasSearchParams,
  resolveTodoCanvasWithFocusOverride,
  sliceOperationalTodoTail,
} from "../data/todo-page-view.shared"
import { ensureDefaultTodoListForOrg } from "../data/todos.mutations.server"
import { listTodosForList } from "../data/todos.queries.server"
import { TodoCanvas } from "./todo-canvas"
import { TodoTail } from "./todo-tail"

/**
 * Org todos page — composes the operational atom canvas with the ranked tail.
 *
 * The rank function is the source of truth for which atom is the canvas; a
 * `?focus=…` search param overrides the pick when the user clicks a tail
 * item. Both pages (org + personal) share the same canvas/tail primitives;
 * only the bound Server Actions and the party graph differ.
 */
export async function TodosPage({
  searchParams,
  orgSlug,
  locale,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  orgSlug: string
  locale: AppLocale
}) {
  const t = await getTranslations("Dashboard.Todos")
  const org = await requireOrgSession()

  const canAdmin = await canActInOrganization(
    org.userId,
    org.user.role,
    org.organizationId,
    "admin"
  )

  const defaultListId = await ensureDefaultTodoListForOrg(org.organizationId)
  const todos = await listTodosForList(defaultListId, org.organizationId, null)

  const params = (await searchParams) ?? {}
  const { focusId, runId } = parseTodoCanvasSearchParams(params)

  const ranked = rankTodosForCanvas(todos)

  const focused = resolveTodoCanvasWithFocusOverride({
    todos,
    rankedCanvas: ranked.canvas,
    rankedWhyNow: ranked.whyNow,
    focusId,
    focusWhyNowLabel: t("whyNowFocusOpened"),
  })
  const { canvas, whyNow } = focused

  const tail = sliceOperationalTodoTail(ranked.ranked, canvas?.id ?? null)
  const totalOpen = ranked.ranked.length

  const captureParts = buildOrgTodoCaptureSeedParts({
    orgSlug,
    locale,
    runId,
  })
  const captureSeed = {
    linkage: captureParts.linkageJson,
    provenance: captureParts.provenanceJson,
  }

  const captureSeedSummary = runId
    ? t("captureSeedOrgRun", { runId, slug: orgSlug, locale })
    : t("captureSeedOrg", { slug: orgSlug, locale })

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title={t("title")}
        description={t("description")}
        eyebrow="Operations"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TodoCanvas
          scope="org"
          canvas={canvas}
          whyNow={whyNow}
          defaultListId={defaultListId}
          captureSeed={captureSeed}
          captureSeedSummary={captureSeedSummary}
          canAdmin={canAdmin}
          actions={{
            create: createOrgTodo,
            complete: completeOrgTodo,
            reopen: reopenOrgTodo,
            snooze: snoozeOrgTodoOneHour,
            remove: deleteOrgTodo,
            addComment: addOrgTodoComment,
            purge: canAdmin ? purgeCompletedOrgTodos : undefined,
          }}
        />
        <TodoTail
          items={tail}
          totalOpen={totalOpen}
          currentId={canvas?.id ?? null}
        />
      </div>
    </div>
  )
}
