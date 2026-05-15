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
import { isOrbitAdvancedOperatorControlsEnabled } from "#flags"
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
import { describeOrgNotificationBadge } from "#features/org-notifications"

import { describePlannerActivityDisplay } from "../audit/planner-activity-display.shared"
import { describePlannerAutomationAttentionKind } from "../automation/planner-automation-attention.shared"
import { addPlannerCommentAction } from "../commands/add-planner-comment"
import { acknowledgePlannerNoticeAction } from "../commands/acknowledge-planner-notice"
import { batchPlannerQueueItemsAction } from "../commands/batch-planner-queue-items"
import { batchPlannerTriageAction } from "../commands/batch-planner-triage"
import { closePlannerNoticeAction } from "../commands/close-planner-notice"
import {
  organizationOrbitPath,
  PLANNER_OWNERSHIP_ROLES,
  PLANNER_RELATION_TYPES,
  PLANNER_SIGNAL_RESOLUTION_POLICIES,
  PLANNER_VIEW_SORT_MODES,
} from "../constants"
import { assignPlannerOwnershipAction } from "../commands/assign-planner-ownership"
import { capturePlannerItemAction } from "../commands/capture-planner-item"
import { correlatePlannerSignalAction } from "../commands/correlate-planner-signal"
import { createPlannerLinkAction } from "../commands/create-planner-link"
import { createPlannerRelationAction } from "../commands/create-planner-relation"
import { createPlannerSignalAction } from "../commands/create-planner-signal"
import { deletePlannerViewAction } from "../commands/delete-planner-view"
import { promotePlannerSignalAction } from "../commands/promote-planner-signal"
import { readPlannerNoticeAction } from "../commands/read-planner-notice"
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
import { buildOrbitKeyboardNavList } from "../domain/orbit-keyboard-nav.shared"
import {
  derivePlannerTriageOperatingLane,
  summarizePlannerTriageOperatingLanes,
  type PlannerTriageOperatingLane,
} from "../triage/planner-triage-rule.shared"
import {
  groupPlannerEvidenceGraphForDisplay,
  type PlannerEvidenceLane,
} from "../evidence/planner-evidence-graph.shared"
import {
  getOrbitPageData,
  getPlannerItemDetail,
  getPlannerLinkDetail,
  getPlannerSessionDetail,
  getPlannerSignalDetail,
} from "../server"
import type {
  OrbitDashboardSurface,
  PlannerBlockedState,
  PlannerEvidenceGraph,
  PlannerLinkRow,
  PlannerOperationalFacts,
  PlannerRelationRow,
  PlannerScopeInput,
  PlannerSessionRow,
  PlannerSurfaceRecordKind,
  PlannerViewSortMode,
} from "../types"
import { OrbitAttachmentForm } from "./orbit-attachment-form.client"
import { OrbitCaptureInput } from "./orbit-capture-input.client"
import { OrbitQueueBatchControls } from "./orbit-queue-batch-controls.client"
import { OrbitTriageBatchControls } from "./orbit-triage-batch-controls.client"
import { OrbitOperatorHotkeys } from "./orbit-operator-hotkeys.client"

const SURFACE_META = {
  queue: { icon: Activity },
  triage: { icon: AlertTriangle },
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
  if (input.scope.scopeKind !== "organization") {
    throw new Error("OrbitPage requires organization scope")
  }
  if (!input.orgSlug) {
    throw new Error("OrbitPage requires an organization slug")
  }
  return organizationOrbitPath(input.orgSlug, input.surface)
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

function isPlannerViewSortMode(
  value: string | null
): value is PlannerViewSortMode {
  return (
    value != null &&
    (PLANNER_VIEW_SORT_MODES as readonly string[]).includes(value)
  )
}

function sortModeLabel(sortMode: PlannerViewSortMode | null) {
  if (sortMode === "priority_desc") return "Priority"
  if (sortMode === "due_asc") return "Due date"
  if (sortMode === "created_desc") return "Created"
  if (sortMode === "updated_desc") return "Updated"
  if (sortMode === "title_asc") return "Title"
  return "Default"
}

function blockedStageLabel(stage: PlannerBlockedState["stage"]) {
  if (stage === "critical") return "Breach"
  if (stage === "urgent") return "Overdue"
  return "Threshold"
}

function blockedStageVariant(stage: PlannerBlockedState["stage"]) {
  if (stage === "critical") return "critical" as const
  if (stage === "urgent") return "warning" as const
  return "outline" as const
}

function noticeSeverityVariant(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return "critical" as const
  if (severity === "warning") return "warning" as const
  return "info" as const
}

function triageOperatingLaneLabel(lane: PlannerTriageOperatingLane) {
  if (lane === "automation_attention") return "Automation attention"
  if (lane === "blocked_recovery") return "Blocked recovery"
  if (lane === "high_pressure") return "High pressure"
  if (lane === "signal_intake") return "Signal intake"
  return "Manual follow-up"
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
  viewerUserId,
  canManageNotices = false,
}: {
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
  searchParams?: OrbitSearchParams
  viewerUserId?: string | null
  canManageNotices?: boolean
}) {
  const [t, advancedOperatorControlsEnabled] = await Promise.all([
    getTranslations("Dashboard.Orbit"),
    isOrbitAdvancedOperatorControlsEnabled(),
  ])
  const basePath = plannerBasePath({ scope, orgSlug, surface })
  const currentSearchParams = toUrlSearchParams(searchParams)
  const focusKind = firstSearchValue(
    searchParams?.focusKind
  ) as PlannerSurfaceRecordKind | null
  const focusId = firstSearchValue(searchParams?.focusId)
  const status = firstSearchValue(searchParams?.status)
  const activeViewSlug = firstSearchValue(searchParams?.view)
  const requestedSortModeRaw = firstSearchValue(searchParams?.sort)
  const requestedSortMode = isPlannerViewSortMode(requestedSortModeRaw)
    ? requestedSortModeRaw
    : null
  const requestedFilter =
    surface === "queue" ||
    surface === "triage" ||
    surface === "today" ||
    surface === "timeline" ||
    surface === "signals"
      ? parsePlannerViewFilterSearchParams({
          q: searchParams?.q,
          lifecycle: searchParams?.lifecycle,
          ownerUserIds: searchParams?.ownerUserIds,
          assignmentRole: searchParams?.assignmentRole,
          automationState: searchParams?.automationState,
          automationKind: searchParams?.automationKind,
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
      ? (page.savedViews.find((view) => view.slug === page.activeViewSlug) ??
        null)
      : null

  const itemDetail =
    focusKind === "item" && focusId
      ? await getPlannerItemDetail(scope, focusId, viewerUserId)
      : null
  const signalDetail =
    focusKind === "signal" && focusId
      ? await getPlannerSignalDetail(scope, focusId)
      : null
  const sessionDetail =
    focusKind === "session" && focusId
      ? await getPlannerSessionDetail(scope, focusId)
      : null
  const linkDetail =
    focusKind === "link" && focusId
      ? await getPlannerLinkDetail(scope, focusId)
      : null
  const hasFocusedRecord = Boolean(focusKind && focusId)

  const listEntries =
    surface === "signals"
      ? page.signals
      : surface === "sessions"
        ? page.sessions
        : surface === "links"
          ? page.links
          : surface === "triage"
            ? [...page.items, ...page.signals]
            : page.items
  const automationAttentionItems =
    surface === "queue" || surface === "triage" || surface === "today"
      ? page.items.filter(
          (item) => (item.operationalFacts?.automationFailureCount ?? 0) > 0
        )
      : []
  const triageOperatingSummary =
    surface === "triage"
      ? summarizePlannerTriageOperatingLanes([
          ...page.items.map((item) => ({
            kind: "item" as const,
            pressureScore: item.pressureScore,
            displayPriority: item.displayPriority,
            blockedState: item.blockedState,
            automationKinds: item.operationalFacts?.automationKinds ?? [],
          })),
          ...page.signals.map((signal) => ({
            kind: "signal" as const,
            pressureScore: signal.pressureScore,
            displayPriority: signal.displayPriority,
            signalClass: signal.signalClass,
          })),
        ])
      : null

  const listNav = buildOrbitKeyboardNavList(surface, page)
  const evidenceGroupTitles: Record<PlannerEvidenceLane, string> = {
    erp: t("evidence.groups.erp"),
    operator: t("evidence.groups.operator"),
    execution: t("evidence.groups.execution"),
    telemetry: t("evidence.groups.telemetry"),
    automation: t("evidence.groups.automation"),
  }
  const supportsQueueBatch =
    surface === "queue" || surface === "today" || surface === "timeline"
  const queueBatchActive = supportsQueueBatch && page.items.length > 0

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
              ? t("status.updatedSignal")
              : status === "batchUpdated"
                ? t("status.batchApplied")
                : status === "commentAdded"
                  ? t("status.commentAdded")
                  : status === "attachmentAdded"
                    ? t("status.attachmentAdded")
                    : status === "noticeRead"
                      ? t("status.noticeRead")
                      : status === "noticeAcknowledged"
                        ? t("status.noticeAcknowledged")
                        : status === "noticeClosed"
                          ? t("status.noticeClosed")
                          : status === "savedView"
                            ? t("status.savedView")
                            : status === "deletedView"
                              ? t("status.deletedView")
                              : status === "startedSession"
                                ? t("status.startedSession")
                                : status === "stoppedSession"
                                  ? t("status.stoppedSession")
                                  : status === "invalidInput"
                                    ? t("status.invalidInput")
                                    : status === "featureDisabled"
                                      ? t("status.featureDisabled")
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
          <CardContent className="grid gap-3 pt-surface-lg md:grid-cols-3 xl:grid-cols-7">
            <SummaryTile
              label={t("surfaces.queue.label")}
              value={summaryValue(page.summary.queueCount)}
            />
            <SummaryTile
              label={t("surfaces.triage.label")}
              value={summaryValue(page.summary.triageCount)}
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
            "triage",
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

      {surface === "queue" ||
      surface === "triage" ||
      surface === "today" ||
      surface === "timeline" ||
      surface === "signals" ? (
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

      {advancedOperatorControlsEnabled ? (
        <OrbitOperatorHotkeys basePath={basePath} listNav={listNav} />
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
            {surface === "triage" && advancedOperatorControlsEnabled ? (
              <form
                action={batchPlannerTriageAction}
                className="space-y-4"
                data-orbit-triage-batch
              >
                <HiddenPlannerScopeFields
                  scope={scope}
                  surface={surface}
                  orgSlug={orgSlug}
                />
                {triageOperatingSummary ? (
                  <OrbitTriageBatchControls
                    automationAttentionCount={
                      triageOperatingSummary.automationAttentionCount
                    }
                    blockedRecoveryCount={
                      triageOperatingSummary.blockedRecoveryCount
                    }
                    highPressureCount={triageOperatingSummary.highPressureCount}
                    signalIntakeCount={triageOperatingSummary.signalIntakeCount}
                    manualFollowUpCount={
                      triageOperatingSummary.manualFollowUpCount
                    }
                    itemCount={page.items.length}
                    signalCount={page.signals.length}
                  />
                ) : null}
                {automationAttentionItems.length > 0 ? (
                  <OrbitAutomationAttentionSection
                    basePath={basePath}
                    currentSearchParams={currentSearchParams}
                    items={automationAttentionItems}
                  />
                ) : null}
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
                        href={focusHref(
                          basePath,
                          currentSearchParams,
                          "item",
                          item.id
                        )}
                        title={item.title}
                        description={item.description}
                        priority={item.displayPriority}
                        pressure={item.pressureScore}
                        state={item.lifecycle}
                        dueAt={item.dueAt}
                        operationalFacts={item.operationalFacts}
                        blockedState={item.blockedState}
                        selectionName="itemIds"
                        selectionValue={item.id}
                        triageLane={derivePlannerTriageOperatingLane({
                          kind: "item",
                          pressureScore: item.pressureScore,
                          displayPriority: item.displayPriority,
                          blockedState: item.blockedState,
                          automationKinds:
                            item.operationalFacts?.automationKinds ?? [],
                        })}
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
                        selectionName="signalIds"
                        selectionValue={signal.id}
                        triageLane={derivePlannerTriageOperatingLane({
                          kind: "signal",
                          pressureScore: signal.pressureScore,
                          displayPriority: signal.displayPriority,
                          signalClass: signal.signalClass,
                        })}
                      />
                    ))}
                  </div>
                )}
              </form>
            ) : queueBatchActive && advancedOperatorControlsEnabled ? (
              <form
                action={batchPlannerQueueItemsAction}
                className="space-y-4"
                data-orbit-queue-batch
              >
                <HiddenPlannerScopeFields
                  scope={scope}
                  surface={surface}
                  orgSlug={orgSlug}
                />
                <input type="hidden" name="surface" value={surface} />
                <OrbitQueueBatchControls itemCount={page.items.length} />
                {automationAttentionItems.length > 0 ? (
                  <OrbitAutomationAttentionSection
                    basePath={basePath}
                    currentSearchParams={currentSearchParams}
                    items={automationAttentionItems}
                  />
                ) : null}
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
                        href={focusHref(
                          basePath,
                          currentSearchParams,
                          "item",
                          item.id
                        )}
                        title={item.title}
                        description={item.description}
                        priority={item.displayPriority}
                        pressure={item.pressureScore}
                        state={item.lifecycle}
                        dueAt={item.dueAt}
                        operationalFacts={item.operationalFacts}
                        blockedState={item.blockedState}
                        selectionName="itemIds"
                        selectionValue={item.id}
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
                        href={focusHref(
                          basePath,
                          currentSearchParams,
                          "link",
                          link.id
                        )}
                        link={link}
                      />
                    ))}
                  </div>
                )}
              </form>
            ) : (
              <>
                {automationAttentionItems.length > 0 ? (
                  <OrbitAutomationAttentionSection
                    basePath={basePath}
                    currentSearchParams={currentSearchParams}
                    items={automationAttentionItems}
                  />
                ) : null}
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
                        href={focusHref(
                          basePath,
                          currentSearchParams,
                          "item",
                          item.id
                        )}
                        title={item.title}
                        description={item.description}
                        priority={item.displayPriority}
                        pressure={item.pressureScore}
                        state={item.lifecycle}
                        dueAt={item.dueAt}
                        operationalFacts={item.operationalFacts}
                        blockedState={item.blockedState}
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
                        href={focusHref(
                          basePath,
                          currentSearchParams,
                          "link",
                          link.id
                        )}
                        link={link}
                      />
                    ))}
                  </div>
                )}
              </>
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
                canManageNotices={canManageNotices}
                evidenceGroupTitles={evidenceGroupTitles}
                formatEvidenceMoreInGroup={(shown, total) =>
                  t("evidence.moreInGroup", { shown, total })
                }
              />
            ) : signalDetail ? (
              <SignalDetailPanel
                detail={signalDetail}
                scope={scope}
                surface={surface}
                orgSlug={orgSlug}
                evidenceGroupTitles={evidenceGroupTitles}
                formatEvidenceMoreInGroup={(shown, total) =>
                  t("evidence.moreInGroup", { shown, total })
                }
              />
            ) : sessionDetail ? (
              <SessionDetailPanel
                detail={sessionDetail}
                scope={scope}
                surface={surface}
                orgSlug={orgSlug}
                evidenceGroupTitles={evidenceGroupTitles}
                formatEvidenceMoreInGroup={(shown, total) =>
                  t("evidence.moreInGroup", { shown, total })
                }
              />
            ) : linkDetail ? (
              <LinkDetailPanel
                detail={linkDetail}
                evidenceGroupTitles={evidenceGroupTitles}
                formatEvidenceMoreInGroup={(shown, total) =>
                  t("evidence.moreInGroup", { shown, total })
                }
              />
            ) : hasFocusedRecord ? (
              <Empty className="border border-dashed border-border/70 bg-muted/20">
                <EmptyTitle>Record unavailable</EmptyTitle>
                <EmptyDescription>
                  The selected Orbit record is unavailable or outside your
                  current scope.
                </EmptyDescription>
              </Empty>
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
  activeView:
    | Awaited<ReturnType<typeof getOrbitPageData>>["savedViews"][number]
    | null
}) {
  const canPersistViews =
    surface === "queue" ||
    surface === "triage" ||
    surface === "today" ||
    surface === "timeline" ||
    surface === "signals"

  return (
    <Card>
      <CardHeader className="border-b border-border/60">
        <CardTitle>
          {canPersistViews ? "Filters and saved views" : "Filters"}
        </CardTitle>
        <CardDescription>
          {canPersistViews
            ? "Keep operator execution surfaces scoped to the current operational lens."
            : "Keep the current operational surface scoped to the right execution lens."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-surface-lg">
        <form
          method="GET"
          action={basePath}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
        >
          {activeView ? (
            <input type="hidden" name="view" value={activeView.slug} />
          ) : null}
          <Input
            name="q"
            aria-label="Orbit search query"
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
          {surface === "signals" ? null : (
            <select
              name="assignmentRole"
              defaultValue={filterSelectValue(activeFilter.assignmentRole)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
            >
              <option value="">All assignment roles</option>
              <option value="assignee">Assignee</option>
              <option value="reviewer">Reviewer</option>
              <option value="escalation_owner">Escalation owner</option>
            </select>
          )}
          {surface === "signals" ? null : (
            <select
              name="automationState"
              defaultValue={filterSelectValue(activeFilter.automationState)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
            >
              <option value="">All automation states</option>
              <option value="attention">Automation attention</option>
            </select>
          )}
          {surface === "signals" ? null : (
            <select
              name="automationKind"
              defaultValue={filterSelectValue(activeFilter.automationKind)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
            >
              <option value="">All automation kinds</option>
              <option value="reminder_delivery">Reminder delivery</option>
              <option value="recurrence_processing">
                Recurrence processing
              </option>
            </select>
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
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
            <Button type="submit" size="sm">
              Apply filters
            </Button>
            <Button asChild type="button" size="sm" variant="outline">
              <Link href={basePath}>Reset</Link>
            </Button>
          </div>
        </form>

        {surface === "today" ? (
          <OrbitTodayAutomationPresets
            basePath={basePath}
            currentSearchParams={currentSearchParams}
            activeFilter={activeFilter}
          />
        ) : null}

        {canPersistViews ? (
          <>
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
                        assignmentRole: null,
                        automationState: null,
                        automationKind: null,
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

            <form
              action={savePlannerViewAction}
              className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]"
            >
              <HiddenPlannerScopeFields
                scope={scope}
                surface={surface}
                orgSlug={orgSlug}
              />
              <input
                type="hidden"
                name="filterState"
                value={serializePlannerViewFilterState(activeFilter)}
              />
              <input
                type="hidden"
                name="sortMode"
                value={activeSortMode ?? ""}
              />
              <input type="hidden" name="viewId" value={activeView?.id ?? ""} />
              <Input
                name="name"
                aria-label="Orbit saved view name"
                placeholder="Saved view name"
                defaultValue={activeView?.name ?? ""}
                required
              />
              <Input
                name="slug"
                aria-label="Orbit saved view slug"
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
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function OrbitTodayAutomationPresets({
  basePath,
  currentSearchParams,
  activeFilter,
}: {
  basePath: string
  currentSearchParams?: OrbitSearchParams
  activeFilter: PlannerViewFilterState
}) {
  const presetSpecs = [
    {
      label: "All automation attention",
      assignmentRole: null,
      automationKind: null,
    },
    {
      label: "Reminder delivery",
      assignmentRole: null,
      automationKind: "reminder_delivery",
    },
    {
      label: "Recurrence processing",
      assignmentRole: null,
      automationKind: "recurrence_processing",
    },
    {
      label: "Assignee automation",
      assignmentRole: "assignee",
      automationKind: null,
    },
    {
      label: "Reviewer automation",
      assignmentRole: "reviewer",
      automationKind: null,
    },
    {
      label: "Escalation-owner automation",
      assignmentRole: "escalation_owner",
      automationKind: null,
    },
  ] as const

  const activeAutomationState =
    activeFilter.automationState?.includes("attention") ?? false
  const activeAssignmentRole = filterSelectValue(activeFilter.assignmentRole)
  const activeAutomationKind = filterSelectValue(activeFilter.automationKind)

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">
          Today automation presets
        </p>
        <p className="text-xs text-muted-foreground">
          Jump directly to unresolved system-generated execution pressure by
          operator role.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {presetSpecs.map((preset) => {
          const isActive =
            activeAutomationState &&
            (preset.automationKind == null
              ? activeAutomationKind === ""
              : activeAutomationKind === preset.automationKind) &&
            (preset.assignmentRole == null
              ? activeAssignmentRole === ""
              : activeAssignmentRole === preset.assignmentRole)

          return (
            <Button
              key={preset.label}
              asChild
              size="sm"
              variant={isActive ? "default" : "outline"}
            >
              <Link
                href={buildOrbitHref(
                  basePath,
                  {
                    automationState: "attention",
                    assignmentRole: preset.assignmentRole,
                    automationKind: preset.automationKind,
                    focusKind: null,
                    focusId: null,
                    status: null,
                  },
                  currentSearchParams
                )}
              >
                {preset.label}
              </Link>
            </Button>
          )
        })}
      </div>
    </div>
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

function OrbitAutomationAttentionSection({
  basePath,
  currentSearchParams,
  items,
}: {
  basePath: string
  currentSearchParams: URLSearchParams
  items: Awaited<ReturnType<typeof getOrbitPageData>>["items"]
}) {
  const groupedByKind = new Map<string, number>()

  for (const item of items) {
    const kinds = item.operationalFacts?.automationKinds ?? []
    if (kinds.length === 0) {
      groupedByKind.set("attention", (groupedByKind.get("attention") ?? 0) + 1)
      continue
    }
    for (const kind of kinds) {
      groupedByKind.set(kind, (groupedByKind.get(kind) ?? 0) + 1)
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Automation attention
          </h3>
          <p className="pt-1 text-xs text-muted-foreground">
            Active system-generated execution pressure linked to these items.
          </p>
        </div>
        <Badge variant="warning">{items.length} open</Badge>
      </div>
      {groupedByKind.size > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {[...groupedByKind.entries()].map(([kind, count]) => (
            <Badge key={kind} variant="outline">
              {kind === "attention"
                ? "Automation attention"
                : describePlannerAutomationAttentionKind(
                    kind as Parameters<
                      typeof describePlannerAutomationAttentionKind
                    >[0]
                  )}{" "}
              · {count}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={focusHref(basePath, currentSearchParams, "item", item.id)}
            className="rounded-xl border border-warning/20 bg-background/80 px-3 py-2 text-sm transition-colors hover:bg-background"
          >
            <span className="block font-medium">{item.title}</span>
            <span className="block pt-1 text-xs text-muted-foreground">
              {(item.operationalFacts?.automationKinds?.length ?? 0) > 0
                ? item
                    .operationalFacts!.automationKinds.map((kind) =>
                      describePlannerAutomationAttentionKind(kind)
                    )
                    .join(" · ")
                : `${item.operationalFacts?.automationFailureCount ?? 0} automation failure${(item.operationalFacts?.automationFailureCount ?? 0) === 1 ? "" : "s"}`}{" "}
              · pressure {item.pressureScore}
            </span>
          </Link>
        ))}
      </div>
    </section>
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
      <Input
        name="title"
        aria-label="Orbit signal title"
        placeholder="Signal summary"
        required
      />
      <Textarea
        name="description"
        aria-label="Orbit signal description"
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
    <form action={capturePlannerItemAction} className="space-y-3">
      <input type="hidden" name="scopeKind" value={scope.scopeKind} />
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="orgSlug" value={orgSlug ?? ""} />
      <OrbitCaptureInput />
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
  operationalFacts,
  blockedState,
  selectionName,
  selectionValue,
  triageLane,
}: {
  href: string
  title: string
  description: string | null
  priority: string
  pressure: number
  state: string
  dueAt: Date | null
  operationalFacts?: PlannerOperationalFacts
  blockedState?: PlannerBlockedState | null
  selectionName?: string
  selectionValue?: string
  triageLane?: PlannerTriageOperatingLane
}) {
  const operationalSummary = [
    operationalFacts?.blockedByCount
      ? `blocked by ${operationalFacts.blockedByCount}`
      : null,
    operationalFacts?.activeSignalCount
      ? `${operationalFacts.activeSignalCount} active signal${operationalFacts.activeSignalCount === 1 ? "" : "s"}`
      : null,
    operationalFacts?.automationFailureCount
      ? operationalFacts.automationKinds.length > 0
        ? operationalFacts.automationKinds
            .map((kind) => describePlannerAutomationAttentionKind(kind))
            .join(" · ")
        : `${operationalFacts.automationFailureCount} automation failure${operationalFacts.automationFailureCount === 1 ? "" : "s"}`
      : null,
    operationalFacts?.escalationOwnerCount ? "escalation owner assigned" : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex items-start gap-3">
      {selectionName && selectionValue ? (
        <input
          type="checkbox"
          name={selectionName}
          value={selectionValue}
          aria-label={`Select ${title}`}
          className="mt-4 size-4 rounded border-input"
        />
      ) : null}
      <Link
        href={href}
        className="block flex-1 rounded-2xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{title}</p>
            {description ? (
              <p className="pt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {triageLane ? (
              <Badge variant="outline">
                {triageOperatingLaneLabel(triageLane)}
              </Badge>
            ) : null}
            {operationalFacts?.automationFailureCount ? (
              <Badge variant="warning">Automation</Badge>
            ) : null}
            {blockedState ? (
              <Badge variant={blockedStageVariant(blockedState.stage)}>
                {blockedStageLabel(blockedState.stage)}
              </Badge>
            ) : null}
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
        </div>
        <div className="pt-3 text-xs text-muted-foreground">
          {state} · pressure {pressure}
          {dueAt ? ` · due ${dueAt.toLocaleString()}` : ""}
        </div>
        {operationalSummary ? (
          <div className="pt-1 text-xs text-muted-foreground">
            {operationalSummary}
          </div>
        ) : null}
        {blockedState ? (
          <div className="pt-1 text-xs text-muted-foreground">
            blocked {blockedState.blockedHours}h · threshold{" "}
            {blockedState.thresholdHours}h
          </div>
        ) : null}
      </Link>
    </div>
  )
}

function OrbitSignalRow({
  href,
  title,
  description,
  signalClass,
  lifecycle,
  pressure,
  selectionName,
  selectionValue,
  triageLane,
}: {
  href: string
  title: string
  description: string | null
  signalClass: string
  lifecycle: string
  pressure: number
  selectionName?: string
  selectionValue?: string
  triageLane?: PlannerTriageOperatingLane
}) {
  return (
    <div className="flex items-start gap-3">
      {selectionName && selectionValue ? (
        <input
          type="checkbox"
          name={selectionName}
          value={selectionValue}
          aria-label={`Select ${title}`}
          className="mt-4 size-4 rounded border-input"
        />
      ) : null}
      <Link
        href={href}
        className="block flex-1 rounded-2xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{title}</p>
            {description ? (
              <p className="pt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {triageLane ? (
              <Badge variant="outline">
                {triageOperatingLaneLabel(triageLane)}
              </Badge>
            ) : null}
            <Badge variant="outline">{signalClass}</Badge>
          </div>
        </div>
        <div className="pt-3 text-xs text-muted-foreground">
          {lifecycle} · pressure {pressure}
        </div>
      </Link>
    </div>
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
  canManageNotices,
  evidenceGroupTitles,
  formatEvidenceMoreInGroup,
}: {
  detail: Awaited<ReturnType<typeof getPlannerItemDetail>>
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
  canManageNotices: boolean
  evidenceGroupTitles: Record<PlannerEvidenceLane, string>
  formatEvidenceMoreInGroup: (shown: number, total: number) => string
}) {
  if (!detail) return null
  const supportsOrgNotices = scope.scopeKind === "organization"

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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {detail.blockedState ? (
              <Badge variant={blockedStageVariant(detail.blockedState.stage)}>
                {blockedStageLabel(detail.blockedState.stage)}
              </Badge>
            ) : null}
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
        </div>
        <p className="pt-3 text-sm text-muted-foreground">
          {detail.lifecycle} · pressure {detail.pressureScore}
          {detail.dueAt ? ` · due ${detail.dueAt.toLocaleString()}` : ""}
        </p>
        {detail.blockedState ? (
          <p className="pt-1 text-xs text-muted-foreground">
            blocked {detail.blockedState.blockedHours}h · threshold{" "}
            {detail.blockedState.thresholdHours}h
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["active", "blocked", "ready_for_review", "verified"] as const).map(
          (state) => (
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
          )
        )}
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

      <form
        action={transitionPlannerItemAction}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-3"
      >
        <HiddenPlannerScopeFields
          scope={scope}
          surface={surface}
          orgSlug={orgSlug}
        />
        <input type="hidden" name="itemId" value={detail.id} />
        <input type="hidden" name="lifecycle" value="resolved" />
        <select
          name="correlatedSignalPolicy"
          defaultValue="auto_resolve"
          className="flex h-9 min-w-52 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
        >
          {PLANNER_SIGNAL_RESOLUTION_POLICIES.map((policy) => (
            <option key={policy} value={policy}>
              {policy}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Resolve item
        </Button>
        {supportsOrgNotices ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="closeActiveNotices"
              defaultChecked
              className="size-4 rounded border-input"
            />
            Close active notices
          </label>
        ) : null}
        <Input
          name="resolutionNote"
          aria-label="Orbit resolution note"
          placeholder="Resolution note (optional)"
          className="min-w-64 flex-1"
        />
      </form>

      <Separator />
      <DetailSection title="Evidence graph">
        <PlannerEvidenceGraphList
          graph={detail.evidenceGraph}
          evidenceGroupTitles={evidenceGroupTitles}
          formatEvidenceMoreInGroup={formatEvidenceMoreInGroup}
        />
      </DetailSection>
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
      {supportsOrgNotices ? (
        <>
          <DetailSection title="Active notices">
            {detail.notices.length === 0 ? (
              <DetailEmpty message="No active Orbit notices for this item." />
            ) : (
              detail.notices.map((notice) => {
                const displayBadge = describeOrgNotificationBadge(notice)

                return (
                  <div
                    key={notice.id}
                    className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={noticeSeverityVariant(notice.severity)}>
                        {notice.severity}
                      </Badge>
                      {displayBadge ? (
                        <Badge
                          variant={noticeSeverityVariant(displayBadge.tone)}
                        >
                          {displayBadge.label}
                        </Badge>
                      ) : null}
                      <Badge
                        variant={notice.targetUserId ? "outline" : "secondary"}
                      >
                        {notice.targetUserId ? "Targeted" : "Broadcast"}
                      </Badge>
                      {notice.isAcknowledged ? (
                        <Badge variant="success">Acknowledged</Badge>
                      ) : notice.isRead ? (
                        <Badge variant="outline">Read</Badge>
                      ) : (
                        <Badge variant="info">Unread</Badge>
                      )}
                    </div>
                    <p className="pt-3 font-medium text-foreground">
                      {notice.title}
                    </p>
                    <p className="pt-1 text-sm text-muted-foreground">
                      {notice.body}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(notice.publishedAt).toLocaleString()}
                      </span>
                      {notice.expiresAt ? (
                        <span>
                          expires {new Date(notice.expiresAt).toLocaleString()}
                        </span>
                      ) : null}
                      {notice.linkedEntityLabel ? (
                        <span>{notice.linkedEntityLabel}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3">
                      {!notice.isRead ? (
                        <form action={readPlannerNoticeAction}>
                          <HiddenPlannerScopeFields
                            scope={scope}
                            surface={surface}
                            orgSlug={orgSlug}
                          />
                          <input
                            type="hidden"
                            name="noticeId"
                            value={notice.id}
                          />
                          <input
                            type="hidden"
                            name="itemId"
                            value={detail.id}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Mark read
                          </Button>
                        </form>
                      ) : null}
                      {!notice.isAcknowledged ? (
                        <form action={acknowledgePlannerNoticeAction}>
                          <HiddenPlannerScopeFields
                            scope={scope}
                            surface={surface}
                            orgSlug={orgSlug}
                          />
                          <input
                            type="hidden"
                            name="noticeId"
                            value={notice.id}
                          />
                          <input
                            type="hidden"
                            name="itemId"
                            value={detail.id}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Acknowledge
                          </Button>
                        </form>
                      ) : null}
                      {canManageNotices ? (
                        <form action={closePlannerNoticeAction}>
                          <HiddenPlannerScopeFields
                            scope={scope}
                            surface={surface}
                            orgSlug={orgSlug}
                          />
                          <input
                            type="hidden"
                            name="noticeId"
                            value={notice.id}
                          />
                          <input
                            type="hidden"
                            name="itemId"
                            value={detail.id}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Close notice
                          </Button>
                        </form>
                      ) : null}
                      {notice.linkedPath ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={notice.linkedPath}>
                            Open linked record
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </DetailSection>
          <DetailSection title="Notice evidence">
            <PlannerNoticeHistoryList notices={detail.noticeHistory} />
          </DetailSection>
        </>
      ) : null}
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
            aria-label="Orbit related item id"
            placeholder="Related item id"
          />
          <Input
            name="relatedSignalId"
            aria-label="Orbit related signal id"
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
          <Input
            name="module"
            aria-label="Orbit link module"
            placeholder="ERP module"
            required
          />
          <Input
            name="entityType"
            aria-label="Orbit link entity type"
            placeholder="Entity type"
            required
          />
          <Input
            name="entityId"
            aria-label="Orbit link entity id"
            placeholder="Entity id"
            required
          />
          <Input
            name="displayLabel"
            aria-label="Orbit link display label"
            placeholder="Display label"
            required
          />
          <Input
            name="href"
            aria-label="Orbit link href"
            placeholder="https://..."
          />
          <Textarea
            name="causalityReason"
            aria-label="Orbit link causality reason"
            placeholder="Why this item links to the ERP object"
            required
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
            aria-label="Orbit comment body"
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
                  {attachment.mimeType} ·{" "}
                  {attachment.sizeBytes.toLocaleString()} bytes
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
        <PlannerActivityList activity={detail.activity} />
      </DetailSection>
    </div>
  )
}

function SignalDetailPanel({
  detail,
  scope,
  surface,
  orgSlug,
  evidenceGroupTitles,
  formatEvidenceMoreInGroup,
}: {
  detail: Awaited<ReturnType<typeof getPlannerSignalDetail>>
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
  evidenceGroupTitles: Record<PlannerEvidenceLane, string>
  formatEvidenceMoreInGroup: (shown: number, total: number) => string
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
          <Input name="itemId" placeholder="Existing item id" required />
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
      <DetailSection title="Evidence graph">
        <PlannerEvidenceGraphList
          graph={detail.evidenceGraph}
          evidenceGroupTitles={evidenceGroupTitles}
          formatEvidenceMoreInGroup={formatEvidenceMoreInGroup}
        />
      </DetailSection>
      <DetailSection title="Activity">
        <PlannerActivityList activity={detail.activity} />
      </DetailSection>
    </div>
  )
}

function SessionDetailPanel({
  detail,
  scope,
  surface,
  orgSlug,
  evidenceGroupTitles,
  formatEvidenceMoreInGroup,
}: {
  detail: Awaited<ReturnType<typeof getPlannerSessionDetail>>
  scope: PlannerScopeInput
  surface: OrbitDashboardSurface
  orgSlug?: string
  evidenceGroupTitles: Record<PlannerEvidenceLane, string>
  formatEvidenceMoreInGroup: (shown: number, total: number) => string
}) {
  if (!detail) return null

  const statusVariant =
    detail.status === "active"
      ? "success"
      : detail.status === "paused"
        ? "warning"
        : "outline"

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              {detail.itemTitle ?? "Orbit session"}
            </h3>
            <p className="pt-1 text-sm text-muted-foreground">
              {detail.summary ?? "Execution continuity and worklog session."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={statusVariant}>{detail.status}</Badge>
            {detail.durationMinutes != null ? (
              <Badge variant="outline">{detail.durationMinutes} min</Badge>
            ) : null}
          </div>
        </div>
        <p className="pt-3 text-sm text-muted-foreground">
          started {detail.startedAt.toLocaleString()}
          {detail.endedAt ? ` · ended ${detail.endedAt.toLocaleString()}` : ""}
          {detail.pausedAt
            ? ` · paused ${detail.pausedAt.toLocaleString()}`
            : ""}
        </p>
        {(detail.createdByUserId || detail.updatedByUserId) && (
          <p className="pt-1 text-xs text-muted-foreground">
            {detail.createdByUserId
              ? `created by ${detail.createdByUserId}`
              : "created by system"}
            {detail.updatedByUserId
              ? ` · updated by ${detail.updatedByUserId}`
              : ""}
          </p>
        )}
      </div>

      {detail.status === "active" ? (
        <form action={stopPlannerSessionAction}>
          <HiddenPlannerScopeFields
            scope={scope}
            surface={surface}
            orgSlug={orgSlug}
          />
          <input type="hidden" name="sessionId" value={detail.id} />
          <Button type="submit" size="sm">
            Stop session
          </Button>
        </form>
      ) : null}

      <DetailSection title="Linked item">
        {detail.item ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{detail.item.title}</p>
              <Badge variant="outline">{detail.item.lifecycle}</Badge>
              <Badge
                variant={
                  detail.item.displayPriority === "critical"
                    ? "critical"
                    : detail.item.displayPriority === "high"
                      ? "warning"
                      : "secondary"
                }
              >
                {detail.item.displayPriority}
              </Badge>
            </div>
            {detail.item.description ? (
              <p className="pt-2 text-sm text-muted-foreground">
                {detail.item.description}
              </p>
            ) : null}
            <p className="pt-2 text-xs text-muted-foreground">
              pressure {detail.item.pressureScore}
              {detail.item.dueAt
                ? ` · due ${detail.item.dueAt.toLocaleString()}`
                : ""}
              {detail.item.scheduleStartAt
                ? ` · scheduled ${detail.item.scheduleStartAt.toLocaleString()}`
                : ""}
            </p>
          </div>
        ) : (
          <DetailEmpty message="No item linked to this session." />
        )}
      </DetailSection>

      <DetailSection title="ERP links">
        {detail.links.length === 0 ? (
          <DetailEmpty />
        ) : (
          detail.links.map((link) => (
            <div
              key={link.id}
              className="rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{link.displayLabel}</span>
                <Badge variant="outline">
                  {link.module}/{link.entityType}
                </Badge>
              </div>
              {link.causalityReason ? (
                <p className="pt-2 text-muted-foreground">
                  {link.causalityReason}
                </p>
              ) : null}
            </div>
          ))
        )}
      </DetailSection>

      <DetailSection title="Evidence graph">
        <PlannerEvidenceGraphList
          graph={detail.evidenceGraph}
          evidenceGroupTitles={evidenceGroupTitles}
          formatEvidenceMoreInGroup={formatEvidenceMoreInGroup}
        />
      </DetailSection>

      <DetailSection title="Recent activity">
        <PlannerActivityList activity={detail.activity} />
      </DetailSection>
    </div>
  )
}

function LinkDetailPanel({
  detail,
  evidenceGroupTitles,
  formatEvidenceMoreInGroup,
}: {
  detail: Awaited<ReturnType<typeof getPlannerLinkDetail>>
  evidenceGroupTitles: Record<PlannerEvidenceLane, string>
  formatEvidenceMoreInGroup: (shown: number, total: number) => string
}) {
  if (!detail) return null

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{detail.displayLabel}</h3>
            <p className="pt-1 text-sm text-muted-foreground">
              {detail.module} · {detail.entityType}
            </p>
          </div>
          <Badge variant="outline">{detail.entityId}</Badge>
        </div>
        {detail.causalityReason ? (
          <p className="pt-3 text-sm text-muted-foreground">
            {detail.causalityReason}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {detail.href ? (
          <Button asChild size="sm" variant="outline">
            <a href={detail.href} target="_blank" rel="noreferrer">
              Open ERP record
            </a>
          </Button>
        ) : null}
        <Badge variant="secondary">
          attached {detail.createdAt.toLocaleString()}
        </Badge>
      </div>

      <DetailSection title="Linked item">
        {detail.item ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{detail.item.title}</p>
              <Badge variant="outline">{detail.item.lifecycle}</Badge>
            </div>
            {detail.item.description ? (
              <p className="pt-2 text-sm text-muted-foreground">
                {detail.item.description}
              </p>
            ) : null}
          </div>
        ) : (
          <DetailEmpty message="No Orbit item is attached to this ERP link." />
        )}
      </DetailSection>

      <DetailSection title="Linked signal">
        {detail.signal ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">
                {detail.signal.title}
              </p>
              <Badge variant="outline">{detail.signal.signalClass}</Badge>
              <Badge variant="outline">{detail.signal.lifecycle}</Badge>
            </div>
            {detail.signal.description ? (
              <p className="pt-2 text-sm text-muted-foreground">
                {detail.signal.description}
              </p>
            ) : null}
          </div>
        ) : (
          <DetailEmpty message="No Orbit signal is attached to this ERP link." />
        )}
      </DetailSection>

      <DetailSection title="Sessions">
        {detail.sessions.length === 0 ? (
          <DetailEmpty message="No execution sessions reference this linked item." />
        ) : (
          detail.sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <span>
                {session.status} · {session.startedAt.toLocaleString()}
              </span>
              {session.durationMinutes != null ? (
                <Badge variant="outline">{session.durationMinutes} min</Badge>
              ) : null}
            </div>
          ))
        )}
      </DetailSection>

      {detail.temporalContext || detail.auditContext ? (
        <DetailSection title="Structured context">
          {detail.temporalContext ? (
            <pre className="overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              {JSON.stringify(detail.temporalContext, null, 2)}
            </pre>
          ) : null}
          {detail.auditContext ? (
            <pre className="overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              {JSON.stringify(detail.auditContext, null, 2)}
            </pre>
          ) : null}
        </DetailSection>
      ) : null}

      <DetailSection title="Evidence graph">
        <PlannerEvidenceGraphList
          graph={detail.evidenceGraph}
          evidenceGroupTitles={evidenceGroupTitles}
          formatEvidenceMoreInGroup={formatEvidenceMoreInGroup}
        />
      </DetailSection>

      <DetailSection title="Activity">
        <PlannerActivityList activity={detail.activity} />
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

function plannerActivityActorLabel(activity: { authorUserId: string | null }) {
  return activity.authorUserId ?? "system"
}

function plannerActivityBadgeVariant(
  tone: ReturnType<typeof describePlannerActivityDisplay>["tone"]
) {
  switch (tone) {
    case "info":
      return "info" as const
    case "warning":
      return "warning" as const
    case "critical":
      return "critical" as const
    case "outline":
    default:
      return "outline" as const
  }
}

function PlannerEvidenceGraphList({
  graph,
  evidenceGroupTitles,
  formatEvidenceMoreInGroup,
}: {
  graph: PlannerEvidenceGraph
  evidenceGroupTitles: Record<PlannerEvidenceLane, string>
  formatEvidenceMoreInGroup: (shown: number, total: number) => string
}) {
  if (graph.nodes.length === 0) {
    return <DetailEmpty message="No evidence graph nodes yet." />
  }

  const sections = groupPlannerEvidenceGraphForDisplay(graph)
  const maxPerSection = 10

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{graph.summary.linkCount} ERP links</Badge>
        <Badge variant="secondary">
          {graph.summary.relationCount} relations
        </Badge>
        <Badge variant="secondary">{graph.summary.activityCount} events</Badge>
        <Badge variant="secondary">{graph.summary.sessionCount} sessions</Badge>
        <Badge variant="secondary">
          {graph.summary.attachmentCount} attachments
        </Badge>
        <Badge variant="secondary">{graph.summary.noticeCount} notices</Badge>
      </div>
      <div className="space-y-6">
        {sections.map((section) => {
          const shown = section.nodes.slice(0, maxPerSection)
          const overflow = section.nodes.length - shown.length
          return (
            <div key={section.lane} className="space-y-2">
              <h5 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {evidenceGroupTitles[section.lane]}
              </h5>
              <div className="space-y-2">
                {shown.map((node) => (
                  <div
                    key={node.id}
                    className="rounded-xl border border-border/60 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant="outline">{node.kind}</Badge>
                        {node.href ? (
                          <a
                            href={node.href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {node.label}
                          </a>
                        ) : (
                          <span className="font-medium text-foreground">
                            {node.label}
                          </span>
                        )}
                      </div>
                      {node.occurredAt ? (
                        <span className="text-xs text-muted-foreground">
                          {node.occurredAt.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    {node.description ? (
                      <p className="pt-2 text-muted-foreground">
                        {node.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              {overflow > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {formatEvidenceMoreInGroup(
                    shown.length,
                    section.nodes.length
                  )}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlannerActivityList({
  activity,
}: {
  activity: {
    id: string
    activityType: string
    body: string
    createdAt: Date
    authorUserId: string | null
  }[]
}) {
  return activity.length === 0 ? (
    <DetailEmpty />
  ) : (
    activity.map((entry) => (
      <div
        key={entry.id}
        className="rounded-xl border border-border/60 px-3 py-2 text-sm"
      >
        <div className="flex items-center gap-2 pb-2">
          <Badge
            variant={plannerActivityBadgeVariant(
              describePlannerActivityDisplay(entry.activityType).tone
            )}
          >
            {describePlannerActivityDisplay(entry.activityType).label}
          </Badge>
        </div>
        <p>{entry.body}</p>
        <p className="pt-2 text-xs text-muted-foreground">
          {plannerActivityActorLabel(entry)} ·{" "}
          {entry.createdAt.toLocaleString()}
        </p>
      </div>
    ))
  )
}

function PlannerNoticeHistoryList({
  notices,
}: {
  notices: NonNullable<
    Awaited<ReturnType<typeof getPlannerItemDetail>>
  >["noticeHistory"]
}) {
  if (notices.length === 0) {
    return <DetailEmpty message="No notice evidence yet." />
  }

  return (
    <div className="space-y-2">
      {notices.map((notice) => {
        const displayBadge = describeOrgNotificationBadge(notice)
        const state = notice.closedAt
          ? "Closed"
          : notice.isAcknowledged
            ? "Acknowledged"
            : notice.isRead
              ? "Read"
              : "Unread"

        return (
          <div
            key={notice.id}
            className="rounded-xl border border-border/60 px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={noticeSeverityVariant(notice.severity)}>
                {notice.severity}
              </Badge>
              {displayBadge ? (
                <Badge variant={noticeSeverityVariant(displayBadge.tone)}>
                  {displayBadge.label}
                </Badge>
              ) : null}
              <Badge variant={notice.closedAt ? "success" : "outline"}>
                {state}
              </Badge>
            </div>
            <p className="pt-2 font-medium">{notice.title}</p>
            <p className="pt-1 text-xs text-muted-foreground">
              published {new Date(notice.publishedAt).toLocaleString()}
              {notice.readAt
                ? ` · read ${new Date(notice.readAt).toLocaleString()}`
                : ""}
              {notice.acknowledgedAt
                ? ` · acknowledged ${new Date(notice.acknowledgedAt).toLocaleString()}`
                : ""}
              {notice.closedAt
                ? ` · closed ${new Date(notice.closedAt).toLocaleString()}`
                : ""}
              {notice.closedByUserId ? ` by ${notice.closedByUserId}` : ""}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function DetailEmpty({ message = "No evidence yet." }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <AlertTriangle className="size-4" />
      <span>{message}</span>
    </div>
  )
}
