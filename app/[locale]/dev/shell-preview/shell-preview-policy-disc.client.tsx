"use client"

import { AppShellPolicyDisc } from "#components2/app-shell/utility-bar.client"
import { OperationalScopeAdminConfigContent } from "#components2/app-shell/operational-scope-admin-config.client"
import type { ActiveScopeEntry } from "#components2/app-shell/operational-scope-admin-config.client"
import type {
  OperationalScopeCatalogEntry,
  OrgOperationalScopePolicyRow,
} from "#features/operational-scope/client"

const PREVIEW_ORG_ID = "00000000-0000-0000-0000-00000000c0de"

/**
 * 10 scope types in the full catalog — the pool of available dimensions.
 * 6 of these are pinned / route-resolved to appear on the utility bar.
 */
const MOCK_SCOPE_CATALOG: OperationalScopeCatalogEntry[] = [
  {
    scopeType: "organization",
    label: "Organization",
    iconName: "building-2",
    module: "core",
    available: true,
  },
  {
    scopeType: "project",
    label: "Project",
    iconName: "folder-kanban",
    module: "planner",
    available: true,
  },
  {
    scopeType: "team",
    label: "Team",
    iconName: "users",
    module: "hrm",
    available: true,
  },
  {
    scopeType: "period",
    label: "Period",
    iconName: "calendar-range",
    module: "finance",
    available: true,
  },
  {
    scopeType: "department",
    label: "Department",
    iconName: "users-2",
    module: "hrm",
    available: true,
  },
  {
    scopeType: "customer",
    label: "Customer",
    iconName: "briefcase",
    module: "crm",
    available: true,
  },
  {
    scopeType: "cost_center",
    label: "Cost center",
    iconName: "landmark",
    module: "finance",
    available: true,
  },
  {
    scopeType: "region",
    label: "Region",
    iconName: "map-pin",
    module: "operations",
    available: true,
  },
  {
    scopeType: "warehouse",
    label: "Warehouse",
    iconName: "warehouse",
    module: "inventory",
    available: true,
  },
  {
    scopeType: "contract",
    label: "Contract",
    iconName: "landmark",
    module: "legal",
    available: false,
  },
]

const MOCK_ORG_POLICIES: OrgOperationalScopePolicyRow[] = [
  {
    id: "pol-1",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "organization",
    policy: "mandatory",
    audience: "all",
    displayOrder: 0,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T08:00:00.000Z"),
  },
  {
    id: "pol-2",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "project",
    policy: "allowed",
    audience: "all",
    displayOrder: 1,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T08:00:00.000Z"),
  },
  {
    id: "pol-3",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "team",
    policy: "mandatory",
    audience: "all",
    displayOrder: 2,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-02T09:00:00.000Z"),
  },
  {
    id: "pol-4",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "period",
    policy: "allowed",
    audience: "all",
    displayOrder: 3,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-02T09:00:00.000Z"),
  },
  {
    id: "pol-5",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "department",
    policy: "allowed",
    audience: "all",
    displayOrder: 4,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-03T10:00:00.000Z"),
  },
  {
    id: "pol-6",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "customer",
    policy: "allowed",
    audience: "all",
    displayOrder: 5,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-03T10:00:00.000Z"),
  },
  {
    id: "pol-7",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "cost_center",
    policy: "allowed",
    audience: "all",
    displayOrder: 6,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-03T10:00:00.000Z"),
  },
  {
    id: "pol-8",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "region",
    policy: "allowed",
    audience: "all",
    displayOrder: 7,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-03T10:00:00.000Z"),
  },
  {
    id: "pol-9",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "warehouse",
    policy: "blocked",
    audience: "all",
    displayOrder: 8,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-03T10:00:00.000Z"),
  },
  {
    id: "pol-10",
    organizationId: PREVIEW_ORG_ID,
    scopeType: "contract",
    policy: "blocked",
    audience: "all",
    displayOrder: 9,
    updatedByUserId: "00000000-0000-0000-0000-00000000abba",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-05-03T10:00:00.000Z"),
  },
]

/**
 * 6 active scopes — mirrors the 6 visible pills on the utility bar.
 * Wires the Path tab in the policy dropdown to the live scope rail state.
 */
const MOCK_ACTIVE_SCOPES: ActiveScopeEntry[] = [
  {
    scopeType: "organization",
    selectedLabel: "Northwind Traders",
    source: "policy",
    authority: "system",
    pinned: true,
    displayOrder: 0,
  },
  {
    scopeType: "project",
    selectedLabel: "Annual Audit 2026",
    source: "route",
    authority: "system",
    pinned: false,
    displayOrder: 1,
  },
  {
    scopeType: "team",
    selectedLabel: "Procurement",
    source: "user",
    authority: "user",
    pinned: true,
    displayOrder: 2,
  },
  {
    scopeType: "period",
    selectedLabel: "Q2 2026",
    source: "user",
    authority: "user",
    pinned: true,
    displayOrder: 3,
  },
  {
    scopeType: "department",
    selectedLabel: "Supply Chain",
    source: "user",
    authority: "user",
    pinned: true,
    displayOrder: 4,
  },
]

/**
 * Policy disc (Scale icon, left rail) — opens a tabbed dropdown panel.
 * Path tab mirrors the 6 active scope pills visible in the utility bar.
 */
export function ShellPreviewPolicyDisc({
  className,
}: {
  className?: string
} = {}) {
  return (
    <AppShellPolicyDisc
      ariaLabel="Operational scope policy"
      tooltip="Scope policy"
      className={className}
      dropdownContent={
        <OperationalScopeAdminConfigContent
          registeredScopes={MOCK_SCOPE_CATALOG}
          orgPolicies={MOCK_ORG_POLICIES}
          organizationId={PREVIEW_ORG_ID}
          activeScopes={MOCK_ACTIVE_SCOPES}
        />
      }
    />
  )
}
