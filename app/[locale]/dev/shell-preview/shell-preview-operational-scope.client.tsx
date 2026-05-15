"use client"

import type { ResolvedOperationalContext } from "#lib/erp/operational-context.shared"
import { OperationalScopeRail } from "#components2/app-shell/operational-scope-rail.client"

const PREVIEW_ORG_ID = "00000000-0000-0000-0000-00000000c0de"

/**
 * 6 dimensions pinned / route-resolved — fills the scope rail slots.
 * The 10-entry catalog (in policy disc) supplies the full available pool;
 * only these 5 appear on the utility bar.
 */
const MOCK_OPERATIONAL_CONTEXT: ResolvedOperationalContext = {
  organizationId: PREVIEW_ORG_ID,
  userId: "00000000-0000-0000-0000-00000000abba",
  resolvedAt: "2026-05-14T12:00:00.000Z",
  scopes: {
    organization: {
      scopeType: "organization",
      selectedId: PREVIEW_ORG_ID,
      selectedLabel: "Northwind Traders",
      selectedSlug: "northwind-traders",
      source: "policy",
      authority: "system",
      pinned: true,
      displayOrder: 0,
    },
    project: {
      scopeType: "project",
      selectedId: "proj-audit-2026",
      selectedLabel: "Annual Audit 2026",
      selectedSlug: null,
      source: "route",
      authority: "system",
      pinned: false,
      displayOrder: 1,
    },
    team: {
      scopeType: "team",
      selectedId: "team-procurement",
      selectedLabel: "Procurement",
      selectedSlug: null,
      source: "user",
      authority: "user",
      pinned: true,
      displayOrder: 2,
    },
    period: {
      scopeType: "period",
      selectedId: "2026-q2",
      selectedLabel: "Q2 2026",
      selectedSlug: null,
      source: "user",
      authority: "user",
      pinned: true,
      displayOrder: 3,
    },
    department: {
      scopeType: "department",
      selectedId: "dept-supply-chain",
      selectedLabel: "Supply Chain",
      selectedSlug: null,
      source: "user",
      authority: "user",
      pinned: true,
      displayOrder: 4,
    },
  },
}

/**
 * Static mock of the operational scope path bar for the components2 shell preview.
 * Shows 5 active scope slots matching the 5 pinned entries above.
 * Server Actions are not wired to a real tenant session — layout chrome only.
 */
export function ShellPreviewOperationalScope() {
  return <OperationalScopeRail operationalContext={MOCK_OPERATIONAL_CONTEXT} />
}
