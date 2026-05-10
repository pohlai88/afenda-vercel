"use client"

import { useActionState, useState, useTransition } from "react"
import { ChevronDown, ChevronRight, Inbox, Calendar, Clock } from "lucide-react"

import { Link, usePathname } from "#i18n/navigation"

import { createIThinkList } from "../actions/create-ithink-list"
import type { IThinkListRow } from "../types"

type IThinkSidebarProps = {
  orgSlug: string
  lists: IThinkListRow[]
  defaultListId: string
  inboxCount: number
  todayCount: number
  scheduledCount: number
}

type CreateListState =
  | undefined
  | { ok: true; id: string }
  | { ok: false; code: "invalid_input" }

async function createListAction(
  _prev: CreateListState,
  formData: FormData
): Promise<CreateListState> {
  return createIThinkList(formData)
}

function navItemClass(isActive: boolean): string {
  return [
    "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-secondary text-secondary-foreground"
      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  ].join(" ")
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function IThinkSidebar({
  orgSlug,
  lists,
  defaultListId,
  inboxCount,
  todayCount,
  scheduledCount,
}: IThinkSidebarProps) {
  const pathname = usePathname()
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [addingList, setAddingList] = useState(false)
  const [, startTransition] = useTransition()
  const [createState, createAction] = useActionState(
    createListAction,
    undefined
  )

  const inboxHref = `/o/${orgSlug}/dashboard/ithink` as const
  const todayHref = `/o/${orgSlug}/dashboard/ithink/today` as const
  const scheduledHref = `/o/${orgSlug}/dashboard/ithink/scheduled` as const

  const isInbox =
    pathname === inboxHref ||
    (pathname.startsWith(`${inboxHref}/`) &&
      !pathname.includes("/today") &&
      !pathname.includes("/scheduled") &&
      !pathname.includes("/p/"))
  const isToday = pathname === todayHref || pathname.startsWith(`${todayHref}/`)
  const isScheduled =
    pathname === scheduledHref || pathname.startsWith(`${scheduledHref}/`)

  const projectLists = lists.filter((l) => l.id !== defaultListId)

  function handleNewListSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    startTransition(() => {
      createAction(new FormData(form))
    })
    setAddingList(false)
    form.reset()
  }

  return (
    <nav className="flex flex-col gap-0.5" aria-label="iThink navigation">
      <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Views
      </p>

      <Link
        href={inboxHref}
        className={navItemClass(isInbox)}
        aria-current={isInbox ? "page" : undefined}
      >
        <Inbox className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Inbox
        <CountBadge count={inboxCount} />
      </Link>

      <Link
        href={todayHref}
        className={navItemClass(isToday)}
        aria-current={isToday ? "page" : undefined}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Today
        <CountBadge count={todayCount} />
      </Link>

      <Link
        href={scheduledHref}
        className={navItemClass(isScheduled)}
        aria-current={isScheduled ? "page" : undefined}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Scheduled
        <CountBadge count={scheduledCount} />
      </Link>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setProjectsOpen((o) => !o)}
          className="flex w-full items-center gap-1 px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground"
          aria-expanded={projectsOpen}
        >
          {projectsOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          )}
          Projects
        </button>

        {projectsOpen && (
          <div className="flex flex-col gap-0.5">
            {projectLists.map((list) => {
              const listHref =
                `/o/${orgSlug}/dashboard/ithink/p/${list.id}` as const
              const isActiveList =
                pathname === listHref || pathname.startsWith(`${listHref}/`)
              return (
                <Link
                  key={list.id}
                  href={listHref}
                  className={navItemClass(isActiveList)}
                  aria-current={isActiveList ? "page" : undefined}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                  <span className="truncate">{list.name}</span>
                </Link>
              )
            })}

            {addingList ? (
              <form
                onSubmit={handleNewListSubmit}
                className="mt-1 flex items-center gap-1 px-2"
              >
                <input
                  type="text"
                  name="name"
                  placeholder="List name…"
                  maxLength={100}
                  autoFocus
                  required
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setAddingList(false)
                  }}
                  onBlur={() => setAddingList(false)}
                  className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingList(true)}
                className="mt-0.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                + New list
              </button>
            )}

            {createState && !createState.ok && (
              <p className="px-2 text-xs text-destructive">
                Could not create list. Please try again.
              </p>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
