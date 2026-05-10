import { CheckSquare } from "lucide-react"

import { createIThinkSubtask as createSubtask } from "../actions/create-subtask"
import { listIThinkSubtasks } from "../data/ithink-subtasks.queries.server"

import { IThinkSubtaskCompleteControl } from "./ithink-subtask-complete-control"

type IThinkSubtasksSectionProps = {
  oneThingId: string
  organizationId: string
}

const STATE_DONE = new Set(["resolved", "deprecated"])

export async function IThinkSubtasksSection({
  oneThingId,
  organizationId,
}: IThinkSubtasksSectionProps) {
  const subtasks = await listIThinkSubtasks(oneThingId, organizationId)

  async function addSubtask(formData: FormData) {
    "use server"
    await createSubtask(formData)
  }

  return (
    <section
      data-slot="subtasks"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckSquare className="h-4 w-4 text-muted-foreground" />
        Sub-tasks
        {subtasks.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {subtasks.length}
          </span>
        )}
      </div>

      {subtasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No sub-tasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {subtasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <IThinkSubtaskCompleteControl
                subtaskId={t.id}
                title={t.title}
                state={t.state}
              />
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${STATE_DONE.has(t.state) ? "bg-muted-foreground" : "bg-primary"}`}
                aria-hidden
              />
              <span
                className={`min-w-0 flex-1 text-sm ${STATE_DONE.has(t.state) ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {t.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground capitalize">
                {t.state}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form action={addSubtask} className="flex gap-2 pt-1">
        <input type="hidden" name="parentId" value={oneThingId} />
        <input
          type="text"
          name="title"
          placeholder="Add sub-task…"
          maxLength={500}
          required
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Add
        </button>
      </form>
    </section>
  )
}

export function SubtasksSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-lg border border-border bg-muted" />
  )
}
