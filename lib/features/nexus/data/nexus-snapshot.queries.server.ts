import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember, neonAuthOrganization } from "#lib/db/schema-neon-auth"
import { organizationAppsPath } from "#lib/org-apps-module-paths"
import { organizationOrbitPath } from "#features/planner"
import {
  countPlannerActiveForOrg,
  countPlannerAutomationAttentionForOrg,
  countPlannerAssigneeOwnedBlockedForOrg,
  countPlannerBlockedForOrg,
  countPlannerEscalationOwnedBlockedForOrg,
  countPlannerForToday,
  countPlannerReviewerOwnedBlockedForOrg,
  listPlannerHighPressureForNexus,
  listPlannerRecentResolutionsForNexus,
} from "#features/planner/server"
import { listHrmHighPressureForNexus } from "#features/hrm/server"

import {
  mapHrmPressureRowsToOperationalPressureItems,
  mapPlannerPressureRowsToOperationalPressureItems,
} from "./nexus-operational-pressure-map.server"

import type {
  NexusSnapshot,
  NexusState,
  NexusSurfaceState,
  OperationalPressureItem,
  OrgContext,
  PriorityLane,
  ResolutionEvent,
} from "../types"

type SessionInput = {
  userId: string
  organizationId: string
  user: { email: string; name: string | null; role: string | null }
}

/**
 * Build a single server-shaped {@link NexusSnapshot} per request.
 *
 * Phase 2 contract: org identity + Orbit pressure / resolutions are real.
 * Other ERP surfaces (accounting, inventory, sale, purchase) show a
 * user-facing coming-soon placeholder until Phase 3 operational UIs ship.
 *
 * Do **not** turn this into a fan-out of per-widget queries. The whole field
 * must remain one server-built snapshot — see AGENTS.md §5 → Nexus runtime.
 */
export async function getNexusSnapshot(input: {
  session: SessionInput
  orgSlug: string
}): Promise<NexusSnapshot> {
  const { session, orgSlug } = input
  const { organizationId, userId } = session

  const [
    identityRow,
    roleRow,
    orbitPressureRows,
    orbitResolutionRows,
    orbitActiveCount,
    orbitAutomationAttentionCount,
    orbitReminderAutomationAttentionCount,
    orbitRecurrenceAutomationAttentionCount,
    orbitBlockedCount,
    orbitAssigneeBlockedCount,
    orbitReviewerBlockedCount,
    orbitEscalationOwnedBlockedCount,
    orbitTodayCount,
    hrmPressureRows,
  ] = await Promise.all([
    db
      .select({ name: neonAuthOrganization.name })
      .from(neonAuthOrganization)
      .where(eq(neonAuthOrganization.id, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ role: neonAuthMember.role })
      .from(neonAuthMember)
      .where(
        and(
          eq(neonAuthMember.organizationId, organizationId),
          eq(neonAuthMember.userId, userId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    listPlannerHighPressureForNexus(organizationId, 5),
    listPlannerRecentResolutionsForNexus(organizationId, 3),
    countPlannerActiveForOrg(organizationId),
    countPlannerAutomationAttentionForOrg(organizationId),
    countPlannerAutomationAttentionForOrg(organizationId, "reminder_delivery"),
    countPlannerAutomationAttentionForOrg(
      organizationId,
      "recurrence_processing"
    ),
    countPlannerBlockedForOrg(organizationId),
    countPlannerAssigneeOwnedBlockedForOrg(organizationId),
    countPlannerReviewerOwnedBlockedForOrg(organizationId),
    countPlannerEscalationOwnedBlockedForOrg(organizationId),
    countPlannerForToday(organizationId),
    listHrmHighPressureForNexus(organizationId, 5),
  ])

  const orgRole = normalizeOrgRole(roleRow?.role ?? null)

  const org: OrgContext = {
    organizationId,
    orgSlug,
    orgName: identityRow?.name ?? orgSlug,
    environment: "production",
    role: orgRole,
  }

  const orbitPressure = mapPlannerPressureRowsToOperationalPressureItems(
    orgSlug,
    orbitPressureRows
  )
  const hrmPressure = mapHrmPressureRowsToOperationalPressureItems(
    orgSlug,
    hrmPressureRows
  )
  const pressure = mergeNexusPressureItems(orbitPressure, hrmPressure)
  const recentResolutions = orbitResolutionRows.map((row) =>
    buildOrbitResolutionEvent(row, orgSlug)
  )
  const activeCount = orbitActiveCount
  const todayCount = orbitTodayCount

  const surfaces = buildSurfaces(orgSlug, activeCount, hrmPressure.length)

  const priorityLanes = buildPriorityLanes(
    orgSlug,
    activeCount,
    orbitAutomationAttentionCount,
    orbitReminderAutomationAttentionCount,
    orbitRecurrenceAutomationAttentionCount,
    orbitBlockedCount,
    orbitAssigneeBlockedCount,
    orbitReviewerBlockedCount,
    orbitEscalationOwnedBlockedCount,
    todayCount
  )

  const state = deriveNexusState(pressure)

  return {
    state,
    org,
    operator: {
      userId: session.userId,
      name: session.user.name,
      email: session.user.email,
      operatingDay: utcOperatingDay(new Date()),
    },
    readiness: {
      status: "ready",
      lynxState: "idle",
    },
    surfaces,
    pressure,
    priorityLanes,
    recentResolutions,
  }
}

// ---------------------------------------------------------------------------
// Derivation helpers
// ---------------------------------------------------------------------------

function normalizeOrgRole(raw: string | null): OrgContext["role"] {
  if (raw === "owner" || raw === "admin" || raw === "member") return raw
  return null
}

function utcOperatingDay(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function deriveNexusState(pressure: OperationalPressureItem[]): NexusState {
  if (pressure.some((p) => p.severity === "emergency")) return "interrupted"
  if (pressure.some((p) => p.severity === "critical")) return "pressure"
  if (pressure.length > 0) return "pressure"
  return "stable"
}

type RawResolutionRow = {
  id: string
  title: string
  resolvedAt: Date
  resolutionNote: string | null
  actorName: string
  evidenceCount: number
  lynxAssisted: boolean
}

function buildOrbitResolutionEvent(
  row: RawResolutionRow,
  orgSlug: string
): ResolutionEvent {
  return {
    id: row.id,
    what: row.title,
    consequence: row.resolutionNote ?? "Resolution committed.",
    surface: "Operations",
    actorName: row.actorName,
    resolvedAt: row.resolvedAt.toISOString(),
    evidenceCount: row.evidenceCount,
    lynxAssisted: row.lynxAssisted,
    href: `${organizationOrbitPath(orgSlug)}?focusKind=item&focusId=${row.id}`,
  }
}

function buildPriorityLanes(
  orgSlug: string,
  activeCount: number,
  automationAttentionCount: number,
  reminderAutomationAttentionCount: number,
  recurrenceAutomationAttentionCount: number,
  blockedCount: number,
  assigneeBlockedCount: number,
  reviewerBlockedCount: number,
  escalationOwnedBlockedCount: number,
  todayCount: number
): PriorityLane[] {
  if (activeCount === 0) return []

  const lanes: PriorityLane[] = []

  if (todayCount > 0) {
    lanes.push({
      id: "orbit-today",
      kind: "approvals",
      label: "Due today",
      surface: "Orbit",
      count: todayCount,
      href: organizationAppsPath(orgSlug, "orbit"),
    })
  }

  if (automationAttentionCount > 0) {
    const specificAutomationCounts = [
      {
        id: "orbit-automation-reminder-delivery",
        label: "Reminder delivery failures",
        count: reminderAutomationAttentionCount,
        href: `${organizationOrbitPath(orgSlug, "today")}?automationState=attention&automationKind=reminder_delivery`,
      },
      {
        id: "orbit-automation-recurrence-processing",
        label: "Recurrence processing failures",
        count: recurrenceAutomationAttentionCount,
        href: `${organizationOrbitPath(orgSlug, "today")}?automationState=attention&automationKind=recurrence_processing`,
      },
    ].filter((entry) => entry.count > 0)

    if (specificAutomationCounts.length > 0) {
      lanes.push(
        ...specificAutomationCounts.map((entry) => ({
          id: entry.id,
          kind: "automation_attention" as const,
          label: entry.label,
          surface: "Orbit",
          count: entry.count,
          href: entry.href,
        }))
      )
    }

    const accountedAutomationCount =
      reminderAutomationAttentionCount + recurrenceAutomationAttentionCount
    const remainingAutomationCount = Math.max(
      automationAttentionCount - accountedAutomationCount,
      0
    )

    if (specificAutomationCounts.length === 0 || remainingAutomationCount > 0) {
      lanes.push({
        id: "orbit-automation-attention",
        kind: "automation_attention",
        label:
          remainingAutomationCount > 0
            ? "Other automation attention"
            : "Automation attention",
        surface: "Orbit",
        count:
          remainingAutomationCount > 0
            ? remainingAutomationCount
            : automationAttentionCount,
        href: `${organizationOrbitPath(orgSlug, "today")}?automationState=attention`,
      })
    }
  }

  if (blockedCount > 0) {
    lanes.push({
      id: "orbit-blocked",
      kind: "vendor_blockers",
      label: "Blocked work",
      surface: "Orbit",
      count: blockedCount,
      href: `${organizationAppsPath(orgSlug, "orbit")}?lifecycle=blocked`,
    })
  }

  if (assigneeBlockedCount > 0) {
    lanes.push({
      id: "orbit-assignee-blocked",
      kind: "assignee_blockers",
      label: "Assignee blockers",
      surface: "Orbit",
      count: assigneeBlockedCount,
      href: `${organizationAppsPath(orgSlug, "orbit")}?lifecycle=blocked&assignmentRole=assignee`,
    })
  }

  if (reviewerBlockedCount > 0) {
    lanes.push({
      id: "orbit-reviewer-blocked",
      kind: "review_blockers",
      label: "Reviewer blockers",
      surface: "Orbit",
      count: reviewerBlockedCount,
      href: `${organizationAppsPath(orgSlug, "orbit")}?lifecycle=blocked&assignmentRole=reviewer`,
    })
  }

  if (escalationOwnedBlockedCount > 0) {
    lanes.push({
      id: "orbit-escalation-owned-blocked",
      kind: "escalation_pressure",
      label: "Escalation-owned blockers",
      surface: "Orbit",
      count: escalationOwnedBlockedCount,
      href: `${organizationAppsPath(orgSlug, "orbit")}?lifecycle=blocked&assignmentRole=escalation_owner`,
    })
  }

  return lanes
}

/**
 * Pure: orders the merged Nexus pressure list by severity then trims so
 * downstream Nexus surfaces never have to think about sort order. The
 * sort is stable within a severity bucket — items keep the producer's
 * insertion order, so Orbit + HRM concerns interleave deterministically.
 *
 * Limit matches the Phase 2 contract (up to 6 visible cards on the
 * field) plus a little headroom for tied severities; the Nexus Field
 * is responsible for any further visual prioritization.
 */
const NEXUS_PRESSURE_DISPLAY_LIMIT = 8
const PRESSURE_SEVERITY_RANK: Record<
  OperationalPressureItem["severity"],
  number
> = {
  emergency: 0,
  critical: 1,
  attention: 2,
  ambient: 3,
}

function mergeNexusPressureItems(
  orbit: OperationalPressureItem[],
  hrm: OperationalPressureItem[]
): OperationalPressureItem[] {
  return [...orbit, ...hrm]
    .sort(
      (a, b) =>
        PRESSURE_SEVERITY_RANK[a.severity] - PRESSURE_SEVERITY_RANK[b.severity]
    )
    .slice(0, NEXUS_PRESSURE_DISPLAY_LIMIT)
}

/**
 * Surface map — 7 operating domains. "Operations" surface uses the live
 * Orbit active count; "Workforce" uses the live HRM pressure count
 * (Phase 4); others remain stubbed for future phases.
 */
function buildSurfaces(
  orgSlug: string,
  activeCount: number,
  hrmPressureCount: number
): NexusSurfaceState[] {
  return [
    {
      id: "cashflow",
      label: "Cashflow",
      surface: "cashflow",
      status: "stable",
      pressureCount: 0,
      freshness: "live",
      href: organizationAppsPath(orgSlug, "accounting"),
    },
    {
      id: "stockIntegrity",
      label: "Stock Integrity",
      surface: "stockIntegrity",
      status: "stable",
      pressureCount: 0,
      freshness: "live",
      href: organizationAppsPath(orgSlug, "inventory"),
    },
    {
      id: "pipeline",
      label: "Pipeline",
      surface: "pipeline",
      status: "stable",
      pressureCount: 0,
      freshness: "live",
      href: organizationAppsPath(orgSlug, "sale"),
    },
    {
      id: "workforce",
      label: "Workforce",
      surface: "workforce",
      status: hrmPressureCount > 0 ? "attention" : "stable",
      pressureCount: hrmPressureCount,
      freshness: "live",
      href: organizationAppsPath(orgSlug, "hrm"),
    },
    {
      id: "procurement",
      label: "Procurement",
      surface: "procurement",
      status: "stable",
      pressureCount: 0,
      freshness: "live",
      href: organizationAppsPath(orgSlug, "purchase"),
    },
    {
      id: "evidence",
      label: "Evidence",
      surface: "evidence",
      status: "stable",
      pressureCount: 0,
      freshness: "live",
      href: organizationAppsPath(orgSlug, "knowledge"),
    },
    {
      id: "operations",
      label: "Operations",
      surface: "operations",
      status: activeCount > 0 ? "attention" : "stable",
      pressureCount: activeCount,
      freshness: "live",
      href: organizationAppsPath(orgSlug, "orbit"),
    },
  ]
}
