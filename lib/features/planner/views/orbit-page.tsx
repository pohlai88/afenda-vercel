import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Link2,
  Radar,
  Timer,
} from "lucide-react"
import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"
import { Input } from "#components/ui/input"
import { Separator } from "#components/ui/separator"
import { Textarea } from "#components/ui/textarea"
import { Link } from "#i18n/navigation"

import { addPlannerCommentAction } from "../commands/add-planner-comment"
import {
  accountOrbitPath,
  organizationOrbitPath,
  PLANNER_OWNERSHIP_ROLES,
  PLANNER_RELATION_TYPES,
  PLANNER_VIEW_SORT_MODES,
} from "../constants"
import { assignPlannerOwnershipAction } from "../commands/assign-planner-ownership"
import { correlatePlannerSignalAction } from "../commands/correlate-planner-signal"
import { createPlannerItemAction } from "../commands/create-planner-item"
import { createPlannerLinkAction } from "../commands/create-planner-link"
import { createPlannerRelationAction } from "../commands/create-planner-relation"
import { createPlannerSignalAction } from "../commands/create-planner-signal"
import { deletePlannerViewAction } from "../commands/delete-planner-view"
import { promotePlannerSignalAction } from "../commands/promote-planner-signal"
import { savePlannerViewAction } from "../commands/save-planner-view"
import { startPlannerSessionAction } from "../commands/start-planner-session"
import { stopPlannerSessionAction } from "../commands/stop-planner-session"
import { transitionPlannerItemAction } from "../commands/transition-planner-item"
import { transitionPlannerSignalAction } from "../commands/transition-planner-signal"
import { upsertPlannerRecurrenceAction } from "../commands/upsert-planner-recurrence"
import { upsertPlannerReminderAction } from "../commands/upsert-planner-reminder"
import { upsertPlannerScheduleAction } from "../commands/upsert-planner-schedule"
import {
  parsePlannerViewFilterSearchParams,
  serializePlannerViewFilterState,
  type PlannerViewFilterState,
} from "../filters/planner-view-filter.shared"
import {
  getOrbitPageData,
  getPlannerItemDetail,
  getPlannerSignalDetail,
} from "../server"
import type {
  OrbitDashboardSurface,
  PlannerLinkRow,
  PlannerRelationRow,
  PlannerScopeInput,
  PlannerSessionRow,
  PlannerSurfaceRecordKind,
  PlannerViewSortMode,
} from "../types"
import { OrbitAttachmentForm } from "./orbit-attachment-form.client"

const SURFACE_META = {
  queue: { icon: Activity },
  today: { icon: CalendarClock },
  timeline: { icon: CalendarClock },
  signals: { icon: Radar },
  sessions: { icon: Timer },
  links: { icon: Link2 },
} as const

function focusHref(
  basePath: string,
  searchParams: URLSearchParams,
  kind: PlannerSurfaceRecordKind,
  id: string
) {
  const next = new URLSearchParams(searchParams)
  next.set("focusKind", kind)
  next.set("focusId", id)
  next.delete("status")
  return `${basePath}?${next.toString()}`
}

function summaryValue(value: number) {
  return new Intl.NumberFormat("en").format(value)
}

function toDatetimeLocalValue(date: Date | null | undefined) {
  if (!date) return ""
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

function plannerBasePath(input: {
  scope: PlannerScopeInput
  orgSlug?: string
  surface: OrbitDashboardSurface
}) {
  return input.scope.scopeKind === "organization"
    ? organizationOrbitPath(input.orgSlug!, input.surface)
    : accountOrbitPath(input.surface)
}

type OrbitSearchParams = Record<string, string | string[] | undefined>

function firstSearchValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return typeof value === "string" ? value : null
}

function toUrlSearchParams(searchParams: OrbitSearchParams | undefined) {
  const next = new URLSearchParams()
  if (!searchParams) return next

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (Array.isArray(rawValue)) {
      for (const entry of rawValue) next.append(key, entry)
      continue
    }
    if (typeof rawValue === "string") next.set(key, rawValue)
  }

  return next
}

function buildOrbitHref(
  basePath: string,
  patch: Record<string, string | null | undefined>,
  currentSearchParams?: OrbitSearchParams
) {
  const search = toUrlSearchParams(currentSearchParams)

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
      search.delete(key)
      continue
    }
    search.set(key, value)
  }

  const next = search.toString()
  return next.length > 0 ? `${basePath}?${next}` : basePath
}

function filterSelectValue(values: readonly string[] | undefined) {
  return values?.[0] ?? ""
}

function isPlannerViewSortMode(value: string | null): value is PlannerViewSortMode {
  return value != null && (PLANNER_VIEW_SORT_MODES as readonly string[]).includes(value)
}

function sortModeLabel(sortMode: PlannerViewSortMode | null) {
  if (sortMode === "priority_desc") return "Priority"
  if (sortMode === "due_asc") return "Due date"
  if (sortMode === "created_desc") return "Created"
  if (sortMode === "updated_desc") return "Updated"
  if (sortMode === "title_asc") return "Title"
  return "Default"
}

function relationLabel(relation: PlannerRelationRow) {
  const target =
    relation.relatedItemTitle ??
    relation.relatedSignalTitle ??
    relation.relatedItemId ??
    relation.relatedSignalId ??
    "Unknown target"

  return `${relation.relationType} · ${target}`
}

export async function OrbitPage({
  scope,
  surface,
  orgSlug,
  searchParams,
}: {
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
  searchParams?: OrbitSearchParams
}) {
  const t = await getTranslations("Dashboard.Orbit")
  const basePath = plannerBasePath({ scope, orgSlug, surface })
  const currentSearchParams = toUrlSearchParams(searchParams)
  const focusKind = firstSearchValue(searchParams?.focusKind) as
    | PlannerSurfaceRecordKind
    | null
  const focusId = firstSearchValue(searchParams?.focusId)
  const status = firstSearchValue(searchParams?.status)
  const activeViewSlug = firstSearchValue(searchParams?.view)
  const requestedSortModeRaw = firstSearchValue(searchParams?.sort)
  const requestedSortMode = isPlannerViewSortMode(requestedSortModeRaw)
    ? requestedSortModeRaw
    : null
  const requestedFilter =
    surface === "queue" || surface === "timeline" || surface === "signals"
      ? parsePlannerViewFilterSearchParams({
          q: searchParams?.q,
          lifecycle: searchParams?.lifecycle,
          ownerUserIds: searchParams?.ownerUserIds,
          signalClass: searchParams?.signalClass,
          displayPriority: searchParams?.displayPriority,
          linkedModule: searchParams?.linkedModule,
        })
      : {}
  const page = await getOrbitPageData(
    scope,
    surface,
    requestedFilter,
    activeViewSlug,
    requestedSortMode
  )
  const activeView =
    page.activeViewSlug != null
      ? page.savedViews.find((view) => view.slug === page.activeViewSlug) ?? null
      : null

  const itemDetail =
    focusKind === "item" && focusId
      ? await getPlannerItemDetail(scope, focusId)
      : null
  const signalDetail =
    focusKind === "signal" && focusId
      ? await getPlannerSignalDetail(scope, focusId)
      : null

  const listEntries =
    surface === "signals"
      ? page.signals
      : surface === "sessions"
        ? page.sessions
        : surface === "links"
          ? page.links
          : page.items

  const statusCopy =
    status === "createdSignal"
      ? t("status.createdSignal")
      : status === "createdItem"
        ? t("status.createdItem")
        : status === "promotedSignal"
          ? t("status.promotedSignal")
          : status === "updatedItem"
            ? t("status.updatedItem")
            : status === "updatedSignal"
              ? "Signal updated."
              : status === "commentAdded"
                ? "Comment added."
                : status === "attachmentAdded"
                  ? "Attachment added."
                  : status === "savedView"
                    ? "Saved view updated."
                    : status === "deletedView"
                      ? "Saved view deleted."
                      : status === "startedSession"
                        ? t("status.startedSession")
                        : status === "stoppedSession"
                          ? t("status.stoppedSession")
                          : status === "invalidInput"
                            ? t("status.invalidInput")
                            : null

  const SurfaceIcon = SURFACE_META[surface].icon

  return (
    <div className="space-y-surface-lg">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t(`surfaces.${surface}.title` as never)}
        description={t(`surfaces.${surface}.description` as never)}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2.1fr)_minmax(18rem,0.9fr)]">
        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle>{t("panels.summaryTitle")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-surface-lg md:grid-cols-3 xl:grid-cols-6">
            <SummaryTile
              label={t("surfaces.queue.label")}
              value={summaryValue(page.summary.queueCount)}
            />
            <SummaryTile
              label={t("surfaces.today.label")}
              value={summaryValue(page.summary.todayCount)}
            />
            <SummaryTile
              label={t("surfaces.timeline.label")}
              value={summaryValue(page.summary.timelineCount)}
            />
            <SummaryTile
              label={t("surfaces.signals.label")}
              value={summaryValue(page.summary.signalCount)}
            />
            <SummaryTile
              label={t("surfaces.sessions.label")}
              value={summaryValue(page.summary.sessionCount)}
            />
            <SummaryTile
              label={t("surfaces.links.label")}
              value={summaryValue(page.summary.linkCount)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/60">
            <CardTitle>{t("quickCreate.signalTitle")}</CardTitle>
            <CardDescription>{t("quickCreate.itemTitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-surface-lg">
            <QuickSignalForm
              scope={scope}
              orgSlug={orgSlug}
              surface={surface}
            />
            <Separator />
            <QuickItemForm scope={scope} orgSlug={orgSlug} surface={surface} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            "queue",
            "today",
            "timeline",
            "signals",
            "sessions",
            "links",
          ] as const
        ).map((entry) => (
          <Button
            key={entry}
            asChild
            size="sm"
            variant={entry === surface ? "default" : "outline"}
          >
            <Link href={plannerBasePath({ scope, orgSlug, surface: entry })}>
              {t(`surfaces.${entry}.label` as never)}
            </Link>
          </Button>
        ))}
      </div>

      {surface === "queue" || surface === "timeline" || surface === "signals" ? (
        <OrbitFilterAndViewBar
          basePath={basePath}
          currentSearchParams={searchParams}
          surface={surface}
          scope={scope}
          orgSlug={orgSlug}
          activeFilter={page.activeFilter}
          activeSortMode={page.activeSortMode}
          savedViews={page.savedViews}
          activeView={activeView}
        />
      ) : null}

      {statusCopy ? (
        <div className="rounded-2xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
          {statusCopy}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.9fr)]">
        <Card className="min-h-[28rem]">
          <CardHeader className="border-b border-border/60">
            <div className="flex items-center gap-2">
              <SurfaceIcon className="size-4 text-muted-foreground" />
              <CardTitle>{t("panels.listTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t(`surfaces.${surface}.description` as never)}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-surface-lg">
            {listEntries.length === 0 ? (
              <Empty className="border border-dashed border-border/70 bg-muted/20">
                <EmptyTitle>{t("panels.emptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("panels.emptyDescription")}
                </EmptyDescription>
              </Empty>
            ) : (
              <div className="space-y-3">
                {page.items.map((item) => (
                  <OrbitItemRow
                    key={item.id}
                    href={focusHref(basePath, currentSearchParams, "item", item.id)}
                    title={item.title}
                    description={item.description}
                    priority={item.displayPriority}
                    pressure={item.pressureScore}
                    state={item.lifecycle}
                    dueAt={item.dueAt}
                  />
                ))}
                {page.signals.map((signal) => (
                  <OrbitSignalRow
                    key={signal.id}
                    href={focusHref(
                      basePath,
                      currentSearchParams,
                      "signal",
                      signal.id
                    )}
                    title={signal.title}
                    description={signal.description}
                    signalClass={signal.signalClass}
                    lifecycle={signal.lifecycle}
                    pressure={signal.pressureScore}
                  />
                ))}
                {page.sessions.map((session) => (
                  <OrbitSessionRow
                    key={session.id}
                    href={focusHref(
                      basePath,
                      currentSearchParams,
                      "session",
                      session.id
                    )}
                    session={session}
                  />
                ))}
                {page.links.map((link) => (
                  <OrbitLinkRow
                    key={link.id}
                    href={focusHref(basePath, currentSearchParams, "link", link.id)}
                    link={link}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[28rem]">
          <CardHeader className="border-b border-border/60">
            <CardTitle>{t("panels.detailTitle")}</CardTitle>
            <CardDescription>
              {t("panels.detailEmptyDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-surface-lg">
            {itemDetail ? (
              <ItemDetailPanel
                detail={itemDetail}
                scope={scope}
                surface={surface}
                orgSlug={orgSlug}
              />
            ) : signalDetail ? (
              <SignalDetailPanel
                detail={signalDetail}
                scope={scope}
                surface={surface}
                orgSlug={orgSlug}
              />
            ) : (
              <Empty className="border border-dashed border-border/70 bg-muted/20">
                <EmptyTitle>{t("panels.detailEmptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("panels.detailEmptyDescription")}
                </EmptyDescription>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OrbitFilterAndViewBar({
  basePath,
  currentSearchParams,
  surface,
  scope,
  orgSlug,
  activeFilter,
  activeSortMode,
  savedViews,
  activeView,
}: {
  basePath: string
  currentSearchParams?: OrbitSearchParams
  surface: OrbitDashboardSurface
  scope: PlannerScopeInput
  orgSlug?: string
  activeFilter: PlannerViewFilterState
  activeSortMode: PlannerViewSortMode | null
  savedViews: Awaited<ReturnType<typeof getOrbitPageData>>["savedViews"]
  activeView: Awaited<ReturnType<typeof getOrbitPageData>>["savedViews"][number] | null
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border/60">
        <CardTitle>Filters and saved views</CardTitle>
        <CardDescription>
          Keep queue, timeline, and signals scoped to the current operational lens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-surface-lg">
        <form method="GET" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {activeView ? (
            <input type="hidden" name="view" value={activeView.slug} />
          ) : null}
          <Input
            name="q"
            placeholder="Search title or context"
            defaultValue={activeFilter.query ?? ""}
          />
          <select
            name="lifecycle"
            defaultValue={filterSelectValue(activeFilter.lifecycle)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">All lifecycles</option>
            {surface === "signals" ? (
              <>
                <option value="detected">Detected</option>
                <option value="correlated">Correlated</option>
                <option value="deferred">Deferred</option>
                <option value="suppressed">Suppressed</option>
              </>
            ) : (
              <>
                <option value="triaged">Triaged</option>
                <option value="assigned">Assigned</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="ready_for_review">Ready for review</option>
              </>
            )}
          </select>
          {surface === "signals" ? (
            <select
              name="signalClass"
              defaultValue={filterSelectValue(activeFilter.signalClass)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
            >
              <option value="">All signal classes</option>
              <option value="manual_capture">Manual capture</option>
              <option value="deadline">Deadline</option>
              <option value="anomaly">Anomaly</option>
              <option value="dependency">Dependency</option>
              <option value="review">Review</option>
              <option value="verification">Verification</option>
            </select>
          ) : (
            <Input
              name="linkedModule"
              placeholder="Linked ERP module"
              defaultValue={filterSelectValue(activeFilter.linkedModule)}
            />
          )}
          <select
            name="displayPriority"
            defaultValue={filterSelectValue(activeFilter.displayPriority)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {surface === "signals" ? (
            <Input
              name="linkedModule"
              placeholder="Linked ERP module"
              defaultValue={filterSelectValue(activeFilter.linkedModule)}
            />
          ) : (
            <Input
              name="ownerUserIds"
              placeholder="Owner user ids"
              defaultValue={activeFilter.ownerUserIds?.join(",") ?? ""}
            />
          )}
          <select
            name="sort"
            defaultValue={activeSortMode ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">Default sort</option>
            {PLANNER_VIEW_SORT_MODES.map((sortMode) => (
              <option key={sortMode} value={sortMode}>
                {sortModeLabel(sortMode)}
              </option>
            ))}
          </select>
          <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              Apply filters
            </Button>
            <Button asChild type="button" size="sm" variant="outline">
              <Link href={basePath}>Reset</Link>
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {savedViews.map((view) => (
            <Button
              key={view.id}
              asChild
              size="sm"
              variant={activeView?.id === view.id ? "default" : "outline"}
            >
              <Link
                href={buildOrbitHref(
                  basePath,
                  {
                    view: view.slug,
                    focusKind: null,
                    focusId: null,
                    q: null,
                    lifecycle: null,
                    ownerUserIds: null,
                    signalClass: null,
                    displayPriority: null,
                    linkedModule: null,
                    sort: view.sortMode,
                  },
                  currentSearchParams
                )}
              >
                {view.name}
                {view.sortMode ? ` · ${sortModeLabel(view.sortMode)}` : ""}
              </Link>
            </Button>
          ))}
        </div>

        <form action={savePlannerViewAction} className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
          <HiddenPlannerScopeFields scope={scope} surface={surface} orgSlug={orgSlug} />
          <input
            type="hidden"
            name="filterState"
            value={serializePlannerViewFilterState(activeFilter)}
          />
          <input type="hidden" name="sortMode" value={activeSortMode ?? ""} />
          <input
            type="hidden"
            name="viewId"
            value={activeView?.id ?? ""}
          />
          <Input
            name="name"
            placeholder="Saved view name"
            defaultValue={activeView?.name ?? ""}
            required
          />
          <Input
            name="slug"
            placeholder="saved-view-slug"
            defaultValue={activeView?.slug ?? ""}
          />
          <Button type="submit" size="sm" variant="outline">
            {activeView ? "Update view" : "Save view"}
          </Button>
          {activeView ? (
            <Button
              formAction={deletePlannerViewAction}
              type="submit"
              size="sm"
              variant="ghost"
              name="viewId"
              value={activeView.id}
            >
              Delete
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="pt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function QuickSignalForm({
  scope,
  orgSlug,
  surface,
}: {
  scope: PlannerScopeInput
  orgSlug?: string
  surface: OrbitDashboardSurface
}) {
  return (
    <form action={createPlannerSignalAction} className="space-y-3">
      <input type="hidden" name="scopeKind" value={scope.scopeKind} />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="orgSlug" value={orgSlug ?? ""} />
      <Input name="title" placeholder="Signal summary" required />
      <Textarea
        name="description"
        placeholder="Operational context (optional)"
      />
      <Button type="submit" size="sm">
        Add signal
      </Button>
    </form>
  )
}

function QuickItemForm({
  scope,
  orgSlug,
  surface,
}: {
  scope: PlannerScopeInput
  orgSlug?: string
  surface: OrbitDashboardSurface
}) {
  return (
    <form action={createPlannerItemAction} className="space-y-3">
      <input type="hidden" name="scopeKind" value={scope.scopeKind} />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="orgSlug" value={orgSlug ?? ""} />
      <Input name="title" placeholder="Execution item title" required />
      <Input name="dueAt" type="datetime-local" />
      <Textarea name="description" placeholder="Execution context (optional)" />
      <Button type="submit" size="sm" variant="outline">
        Add item
      </Button>
    </form>
  )
}

function OrbitItemRow({
  href,
  title,
  description,
  priority,
  pressure,
  state,
  dueAt,
}: {
  href: string
  title: string
  description: string | null
  priority: string
  pressure: number
  state: string
  dueAt: Date | null
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          {description ? (
            <p className="pt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Badge
          variant={
            priority === "critical"
              ? "critical"
              : priority === "high"
                ? "warning"
                : "secondary"
          }
        >
          {priority}
        </Badge>
      </div>
      <div className="pt-3 text-xs text-muted-foreground">
        {state} · pressure {pressure}
        {dueAt ? ` · due ${dueAt.toLocaleString()}` : ""}
      </div>
    </Link>
  )
}

function OrbitSignalRow({
  href,
  title,
  description,
  signalClass,
  lifecycle,
  pressure,
}: {
  href: string
  title: string
  description: string | null
  signalClass: string
  lifecycle: string
  pressure: number
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          {description ? (
            <p className="pt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Badge variant="outline">{signalClass}</Badge>
      </div>
      <div className="pt-3 text-xs text-muted-foreground">
        {lifecycle} · pressure {pressure}
      </div>
    </Link>
  )
}

function OrbitSessionRow({
  href,
  session,
}: {
  href: string
  session: PlannerSessionRow
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {session.itemTitle ?? "Unbound session"}
          </p>
          <p className="pt-1 text-sm text-muted-foreground">
            {session.summary ?? "Execution session"}
          </p>
        </div>
        <Badge variant={session.status === "active" ? "info" : "secondary"}>
          {session.status}
        </Badge>
      </div>
      <div className="pt-3 text-xs text-muted-foreground">
        started {session.startedAt.toLocaleString()}
        {session.durationMinutes != null
          ? ` · ${session.durationMinutes} min`
          : ""}
      </div>
    </Link>
  )
}

function OrbitLinkRow({ href, link }: { href: string; link: PlannerLinkRow }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{link.displayLabel}</p>
          <p className="pt-1 text-sm text-muted-foreground">
            {link.module} · {link.entityType}
          </p>
        </div>
        <Badge variant="outline">{link.entityId}</Badge>
      </div>
      {link.causalityReason ? (
        <p className="pt-3 text-xs text-muted-foreground">
          {link.causalityReason}
        </p>
      ) : null}
    </Link>
  )
}

function HiddenPlannerScopeFields({
  scope,
  surface,
  orgSlug,
}: {
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
}) {
  return (
    <>
      <input type="hidden" name="scopeKind" value={scope.scopeKind} />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="orgSlug" value={orgSlug ?? ""} />
    </>
  )
}

function ItemDetailPanel({
  detail,
  scope,
  surface,
  orgSlug,
}: {
  detail: Awaited<ReturnType<typeof getPlannerItemDetail>>
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
}) {
  if (!detail) return null

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{detail.title}</h3>
            {detail.description ? (
              <p className="pt-1 text-sm text-muted-foreground">
                {detail.description}
              </p>
            ) : null}
          </div>
          <Badge
            variant={
              detail.displayPriority === "critical"
                ? "critical"
                : detail.displayPriority === "high"
                  ? "warning"
                  : "secondary"
            }
          >
            {detail.displayPriority}
          </Badge>
        </div>
        <p className="pt-3 text-sm text-muted-foreground">
          {detail.lifecycle} · pressure {detail.pressureScore}
          {detail.dueAt ? ` · due ${detail.dueAt.toLocaleString()}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            "active",
            "blocked",
            "ready_for_review",
            "verified",
            "resolved",
          ] as const
        ).map((state) => (
          <form key={state} action={transitionPlannerItemAction}>
            <HiddenPlannerScopeFields
              scope={scope}
              surface={surface}
              orgSlug={orgSlug}
            />
            <input type="hidden" name="itemId" value={detail.id} />
            <input type="hidden" name="lifecycle" value={state} />
            <Button type="submit" size="sm" variant="outline">
              {state}
            </Button>
          </form>
        ))}
        <form action={startPlannerSessionAction}>
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <Button type="submit" size="sm">
            Start session
          </Button>
        </form>
      </div>

      <Separator />
      <DetailSection title="Schedule">
        <form
          action={upsertPlannerScheduleAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <Input
            name="scheduleStartAt"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(
              detail.schedule?.scheduledStartAt ?? detail.scheduleStartAt
            )}
          />
          <Input
            name="scheduledEndAt"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(
              detail.schedule?.scheduledEndAt ?? detail.endAt
            )}
          />
          <Input
            name="dueAt"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(detail.dueAt)}
          />
          <Input
            name="snoozedUntil"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(detail.schedule?.snoozedUntil)}
          />
          <Input
            name="timeZone"
            defaultValue={detail.schedule?.timeZone ?? "Asia/Kuala_Lumpur"}
            placeholder="Timezone"
          />
          <Button type="submit" size="sm" variant="outline">
            Save schedule
          </Button>
        </form>
      </DetailSection>
      <DetailSection title="Reminder">
        <form
          action={upsertPlannerReminderAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <Input
            name="remindAt"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocalValue(detail.reminders[0]?.remindAt)}
          />
          <Input
            name="snoozedUntil"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(
              detail.reminders[0]?.snoozedUntil
            )}
          />
          <Button type="submit" size="sm" variant="outline">
            Save reminder
          </Button>
        </form>
        {detail.reminders.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Next reminder: {detail.reminders[0]!.remindAt.toLocaleString()} ·{" "}
            {detail.reminders[0]!.status}
          </p>
        ) : (
          <DetailEmpty />
        )}
      </DetailSection>
      <DetailSection title="Recurrence">
        <form
          action={upsertPlannerRecurrenceAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <Input
            name="rrule"
            defaultValue={detail.recurrence?.rrule ?? "FREQ=WEEKLY;INTERVAL=1"}
            placeholder="FREQ=WEEKLY;INTERVAL=1"
            required
          />
          <Input
            name="timeZone"
            defaultValue={detail.recurrence?.timeZone ?? "Asia/Kuala_Lumpur"}
            placeholder="Timezone"
          />
          <Input
            name="nextRunAt"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(detail.recurrence?.nextRunAt)}
          />
          <Button type="submit" size="sm" variant="outline">
            Save recurrence
          </Button>
        </form>
        {detail.recurrence ? (
          <p className="text-sm text-muted-foreground">
            {detail.recurrence.rrule}
            {detail.recurrence.nextRunAt
              ? ` · next ${detail.recurrence.nextRunAt.toLocaleString()}`
              : ""}
          </p>
        ) : (
          <DetailEmpty />
        )}
      </DetailSection>
      <DetailSection title="Assignments">
        <form
          action={assignPlannerOwnershipAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <select
            name="role"
            defaultValue={detail.assignments[0]?.role ?? "assignee"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {PLANNER_OWNERSHIP_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <Input
            name="subjectLabel"
            placeholder="Assignee label"
            defaultValue={detail.assignments[0]?.subjectLabel ?? ""}
          />
          <Input
            name="subjectUserId"
            placeholder="User id (optional)"
            defaultValue={detail.assignments[0]?.subjectUserId ?? ""}
          />
          <Button type="submit" size="sm" variant="outline">
            Save assignment
          </Button>
        </form>
        {detail.assignments.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.assignments.map((assignment) => (
            <p key={assignment.id} className="text-sm text-muted-foreground">
              {assignment.role} ·{" "}
              {assignment.subjectLabel ?? assignment.subjectUserId ?? "Unbound"}
            </p>
          ))
        )}
      </DetailSection>
      <DetailSection title="Relations">
        <form
          action={createPlannerRelationAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <select
            name="relationType"
            defaultValue="related"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {PLANNER_RELATION_TYPES.map((relationType) => (
              <option key={relationType} value={relationType}>
                {relationType}
              </option>
            ))}
          </select>
          <Input
            name="relatedItemId"
            placeholder="Related item id"
          />
          <Input
            name="relatedSignalId"
            placeholder="Related signal id"
          />
          <Button type="submit" size="sm" variant="outline">
            Create relation
          </Button>
        </form>
        {detail.relations.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.relations.map((relation) => (
            <p key={relation.id} className="text-sm text-muted-foreground">
              {relationLabel(relation)}
            </p>
          ))
        )}
      </DetailSection>
      <DetailSection title="Links">
        <form
          action={createPlannerLinkAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <Input name="module" placeholder="ERP module" required />
          <Input name="entityType" placeholder="Entity type" required />
          <Input name="entityId" placeholder="Entity id" required />
          <Input name="displayLabel" placeholder="Display label" required />
          <Input name="href" placeholder="https://..." />
          <Textarea
            name="causalityReason"
            placeholder="Why this item links to the ERP object"
          />
          <Button type="submit" size="sm" variant="outline">
            Create ERP link
          </Button>
        </form>
        {detail.links.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.links.map((link) => (
            <p key={link.id} className="text-sm text-muted-foreground">
              {link.displayLabel} · {link.module}/{link.entityType}
            </p>
          ))
        )}
      </DetailSection>
      <DetailSection title="Comments">
        <form
          action={addPlannerCommentAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="itemId" value={detail.id} />
          <Textarea
            name="body"
            placeholder="Add operational context, evidence, or decision notes"
            required
          />
          <Button type="submit" size="sm" variant="outline">
            Add comment
          </Button>
        </form>
        {detail.comments.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <p>{comment.body}</p>
              <p className="pt-2 text-xs text-muted-foreground">
                {comment.authorUserId} · {comment.createdAt.toLocaleString()}
              </p>
            </div>
          ))
        )}
      </DetailSection>
      <DetailSection title="Attachments">
        <OrbitAttachmentForm
          scope={scope}
          surface={surface}
          orgSlug={orgSlug}
          itemId={detail.id}
        />
        {detail.attachments.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {attachment.url.split("/").at(-1) ?? "Attachment"}
                </a>
                <p className="pt-1 text-xs text-muted-foreground">
                  {attachment.mimeType} · {attachment.sizeBytes.toLocaleString()} bytes
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {attachment.createdAt.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </DetailSection>
      <DetailSection title="Sessions">
        {detail.sessions.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-2 text-sm text-muted-foreground"
            >
              <span>
                {session.status} · {session.startedAt.toLocaleString()}
              </span>
              {session.status === "active" ? (
                <form action={stopPlannerSessionAction}>
                  <HiddenPlannerScopeFields
                    scope={scope}
                    surface={surface}
                    orgSlug={orgSlug}
                  />
                  <input type="hidden" name="sessionId" value={session.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Stop
                  </Button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </DetailSection>
      <DetailSection title="Activity">
        {detail.activity.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.activity.map((activity) => (
            <p key={activity.id} className="text-sm text-muted-foreground">
              {activity.body}
            </p>
          ))
        )}
      </DetailSection>
    </div>
  )
}

function SignalDetailPanel({
  detail,
  scope,
  surface,
  orgSlug,
}: {
  detail: Awaited<ReturnType<typeof getPlannerSignalDetail>>
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
}) {
  if (!detail) return null

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{detail.title}</h3>
            {detail.description ? (
              <p className="pt-1 text-sm text-muted-foreground">
                {detail.description}
              </p>
            ) : null}
          </div>
          <Badge variant="outline">{detail.signalClass}</Badge>
        </div>
        <p className="pt-3 text-sm text-muted-foreground">
          {detail.lifecycle} · pressure {detail.pressureScore}
          {detail.originatingSystem ? ` · ${detail.originatingSystem}` : ""}
        </p>
      </div>

      <form action={promotePlannerSignalAction}>
        <HiddenPlannerScopeFields
          scope={scope}
          surface={surface}
          orgSlug={orgSlug}
        />
        <input type="hidden" name="signalId" value={detail.id} />
        <Button type="submit" size="sm">
          Promote to item
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(
          [
            "correlated",
            "deferred",
            "suppressed",
            "dismissed",
            "expired",
            "auto_resolved",
          ] as const
        ).map((state) => (
          <form key={state} action={transitionPlannerSignalAction}>
            <HiddenPlannerScopeFields
              scope={scope}
              surface={surface}
              orgSlug={orgSlug}
            />
            <input type="hidden" name="signalId" value={detail.id} />
            <input type="hidden" name="lifecycle" value={state} />
            <Button type="submit" size="sm" variant="outline">
              {state}
            </Button>
          </form>
        ))}
      </div>

      <Separator />
      <DetailSection title="Correlate to item">
        <form
          action={correlatePlannerSignalAction}
          className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3"
        >
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="signalId" value={detail.id} />
          <Input
            name="itemId"
            placeholder="Existing item id"
            required
          />
          <Button type="submit" size="sm" variant="outline">
            Correlate signal
          </Button>
        </form>
        {detail.relatedItems.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.relatedItems.map((relation) => (
            <p key={relation.id} className="text-sm text-muted-foreground">
              {relationLabel(relation)}
            </p>
          ))
        )}
      </DetailSection>
      <DetailSection title="Links">
        {detail.links.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.links.map((link) => (
            <p key={link.id} className="text-sm text-muted-foreground">
              {link.displayLabel} · {link.module}/{link.entityType}
            </p>
          ))
        )}
      </DetailSection>
      <DetailSection title="Activity">
        {detail.activity.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.activity.map((activity) => (
            <p key={activity.id} className="text-sm text-muted-foreground">
              {activity.body}
            </p>
          ))
        )}
      </DetailSection>
    </div>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function DetailEmpty() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <AlertTriangle className="size-4" />
      <span>No evidence yet.</span>
    </div>
  )
}
