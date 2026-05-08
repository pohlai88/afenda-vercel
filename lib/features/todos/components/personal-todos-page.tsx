import { getTranslations } from "next-intl/server"

import { requireAuthShellSignedInSession } from "#lib/auth"
import type { AppLocale } from "#lib/i18n/locales.shared"

import { completePersonalTodo } from "../actions/complete-personal-todo"
import { createPersonalTodo } from "../actions/create-personal-todo"
import { deletePersonalTodo } from "../actions/delete-personal-todo"
import { rankTodosForCanvas } from "../data/todo-rank.server"
import {
  buildPersonalTodoCaptureSeedParts,
  parseTodoCanvasSearchParams,
  resolveTodoCanvasWithFocusOverride,
  sliceOperationalTodoTail,
} from "../data/todo-page-view.shared"
import { ensureDefaultTodoListForUser } from "../data/todos.mutations.server"
import { listTodosForList } from "../data/todos.queries.server"
import { TodoCanvas } from "./todo-canvas"
import { TodoTail } from "./todo-tail"

/**
 * Personal todos page — same canvas + tail primitives as the org page; the
 * party graph is "you" by default so the counter-party line and resolve
 * actions degrade gracefully. The personal page does not expose snooze /
 * reopen / comment / purge because the personal action surface is narrower
 * by design (see `lib/features/todos/actions/*-personal-todo.ts`).
 */
export async function PersonalTodosPage({
  searchParams,
  locale,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  locale: AppLocale
}) {
  const t = await getTranslations("Dashboard.Todos")
  const session = await requireAuthShellSignedInSession()

  const defaultListId = await ensureDefaultTodoListForUser(session.userId)
  const todos = await listTodosForList(defaultListId, null, session.userId)

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

  const captureParts = buildPersonalTodoCaptureSeedParts({ locale, runId })
  const captureSeed = {
    linkage: captureParts.linkageJson,
    provenance: captureParts.provenanceJson,
  }

  const captureSeedSummary = runId
    ? t("captureSeedPersonalRun", { runId, locale })
    : t("captureSeedPersonal", { locale })

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("personalTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("personalDescription")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <TodoCanvas
          scope="personal"
          canvas={canvas}
          whyNow={whyNow}
          defaultListId={defaultListId}
          captureSeed={captureSeed}
          captureSeedSummary={captureSeedSummary}
          actions={{
            create: createPersonalTodo,
            complete: completePersonalTodo,
            remove: deletePersonalTodo,
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
