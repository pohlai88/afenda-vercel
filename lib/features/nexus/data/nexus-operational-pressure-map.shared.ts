import {
  describePlannerAutomationAttentionKind,
  organizationOrbitPath,
} from "#features/orbit"
import type { PlannerPressureRowForNexus } from "#features/orbit/server"
import type { HrmPressureRowForNexus } from "#features/hrm/server"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

import type { OperationalPressureItem } from "../types"

/**
 * Local path composer — keeps this `.shared` module free of the
 * `#features/hrm/client` value-import chain (Server Actions → `lib/auth`
 * → `next/headers`), which Vitest cannot resolve from a unit test.
 * Path semantics match `organizationHrmPath(slug, segment)` from
 * `#features/hrm/client` for the segments we link to here.
 */
function nexusHrmDeepLink(orgSlug: string, segment: "" | string): string {
  const base = organizationAppsPath(orgSlug, "hrm")
  return segment ? `${base}/${segment}` : base
}

export function mapPlannerPressureRowsToOperationalPressureItems(
  orgSlug: string,
  rows: PlannerPressureRowForNexus[]
): OperationalPressureItem[] {
  return rows.map((row) => ({
    ...(function () {
      const automationKinds =
        row.operationalFacts?.automationKinds?.map((kind) =>
          describePlannerAutomationAttentionKind(kind)
        ) ?? []
      const automationReason =
        automationKinds.length > 0
          ? automationKinds.join(" · ")
          : row.operationalFacts?.automationFailureCount
            ? `${row.operationalFacts.automationFailureCount} automation failure${row.operationalFacts.automationFailureCount === 1 ? "" : "s"}`
            : null

      return {
        severity:
          row.displayPriority === "critical"
            ? "emergency"
            : row.displayPriority === "high"
              ? "critical"
              : "attention",
        reason:
          row.kind === "signal"
            ? `Signal: ${row.signalClass ?? row.lifecycle}`
            : row.lifecycle === "blocked"
              ? [
                  row.blockedState
                    ? `${row.blockedState.stage === "critical" ? "Escalation breach" : row.blockedState.stage === "urgent" ? "Escalation overdue" : "Escalation threshold reached"}`
                    : null,
                  row.operationalFacts?.blockedByCount
                    ? `Blocked by ${row.operationalFacts.blockedByCount} dependenc${row.operationalFacts.blockedByCount === 1 ? "y" : "ies"}`
                    : "Blocked execution item",
                  row.operationalFacts?.activeSignalCount
                    ? `${row.operationalFacts.activeSignalCount} active signal${row.operationalFacts.activeSignalCount === 1 ? "" : "s"}`
                    : null,
                  automationReason,
                  row.operationalFacts?.escalationOwnerCount
                    ? "Escalation owner assigned"
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : automationReason
                ? automationReason
                : row.dueAt
                  ? `Due ${row.dueAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}`
                  : row.lifecycle,
      }
    })(),
    id: row.id,
    title: row.title,
    surface: "Operations",
    evidenceCount:
      row.kind === "item"
        ? (row.operationalFacts?.activeSignalCount ?? 0) +
          (row.operationalFacts?.blockedByCount ?? 0) +
          (row.operationalFacts?.automationFailureCount ?? 0)
        : 0,
    primaryAction: {
      label: row.kind === "signal" ? "Open signal" : "Open item",
      command:
        row.kind === "signal"
          ? `${organizationOrbitPath(orgSlug, "triage")}?focusKind=signal&focusId=${row.id}`
          : `${organizationOrbitPath(orgSlug)}?focusKind=item&focusId=${row.id}`,
    },
    stageBadge:
      row.kind === "item" && row.blockedState
        ? {
            label:
              row.blockedState.stage === "critical"
                ? "Breach"
                : row.blockedState.stage === "urgent"
                  ? "Overdue"
                  : "Threshold",
            tone:
              row.blockedState.stage === "critical"
                ? "critical"
                : row.blockedState.stage === "urgent"
                  ? "warning"
                  : "info",
          }
        : null,
  }))
}

/**
 * HRM pressure mapper — Phase 4. Projects {@link HrmPressureRowForNexus}
 * into the Nexus `OperationalPressureItem` shape. Surface label is
 * always `"Workforce"` (the existing surface in `getNexusSnapshot`'s
 * surface map). Routes deep-link into the relevant HRM capability page
 * so the operator can resolve the pressure without leaving Nexus
 * context.
 */
export function mapHrmPressureRowsToOperationalPressureItems(
  orgSlug: string,
  rows: readonly HrmPressureRowForNexus[]
): OperationalPressureItem[] {
  return rows.map((row): OperationalPressureItem => {
    const severity =
      row.displayPriority === "critical"
        ? "emergency"
        : row.displayPriority === "high"
          ? "critical"
          : "attention"

    if (row.kind === "claim_pending") {
      return {
        id: `hrm-claim-${row.id}`,
        severity,
        title: row.title,
        surface: "Workforce",
        reason: row.description ?? "Claim awaiting your decision",
        evidenceCount: row.evidenceCount,
        primaryAction: {
          label: "Review claim",
          command: nexusHrmDeepLink(orgSlug, "claims"),
        },
      }
    }

    if (row.kind === "leave_pending_approval") {
      return {
        id: `hrm-leave-${row.id}`,
        severity,
        title: row.title,
        surface: "Workforce",
        reason: row.description ?? "Leave decision awaiting approval",
        evidenceCount: 0,
        primaryAction: {
          label: "Review leave",
          command: nexusHrmDeepLink(orgSlug, "leave"),
        },
      }
    }

    if (row.kind === "document_expiring") {
      const remainingLabel =
        row.daysToExpiry < 0
          ? "Expired"
          : row.daysToExpiry === 0
            ? "Expires today"
            : `Expires in ${row.daysToExpiry} day${row.daysToExpiry === 1 ? "" : "s"}`
      return {
        id: `hrm-doc-${row.id}`,
        severity,
        title: row.title,
        surface: "Workforce",
        reason: `${row.documentType.replace(/_/g, " ")} · ${remainingLabel}`,
        evidenceCount: 0,
        primaryAction: {
          label: "Open documents",
          command: nexusHrmDeepLink(orgSlug, "documents"),
        },
        stageBadge:
          row.displayPriority === "critical"
            ? { label: "Urgent", tone: "critical" }
            : row.displayPriority === "high"
              ? { label: "Action soon", tone: "warning" }
              : { label: "Upcoming", tone: "info" },
      }
    }

    return {
      id: `hrm-compliance-${row.id}`,
      severity: "emergency",
      title: row.title,
      surface: "Workforce",
      reason: row.description ?? "Statutory submission failed",
      evidenceCount: 0,
      primaryAction: {
        label: "Open compliance",
        command: organizationAppsPath(orgSlug, "hrm"),
      },
      stageBadge: { label: "Failed", tone: "critical" },
    }
  })
}
