export type CreateOrgTodoFormState =
  | undefined
  | {
      ok: true
    }
  | {
      ok: false
      errors: {
        title?: string
        form?: string
      }
    }

export type TodoRow = {
  id: string
  listId: string
  title: string
  description: string
  state: string
  priority: string
  dueAt: Date | null
  snoozeUntil: Date | null
  assigneeUserId: string | null
  recurrenceRule: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}

export type TodoListRow = {
  id: string
  name: string
  slug: string
  archivedAt: Date | null
}
