"use client"

import { useTransition } from "react"
import {
  Briefcase,
  Building2,
  CalendarRange,
  CheckCircle2,
  Circle,
  FolderKanban,
  Landmark,
  Lock,
  MapPin,
  Scale,
  Users,
  Users2,
  Warehouse,
} from "lucide-react"
import type { ComponentType } from "react"

import {
  setOrgScopePolicyAction,
  SCOPE_RAIL_VISIBLE_LIMIT,
} from "#features/operational-scope/client"
import type {
  OrgOperationalScopePolicyRow,
  OrgScopePolicy,
} from "#features/operational-scope/client"
import { cn } from "#lib/utils"
import { uiTracking } from "#lib/design-system"
import { Alert, AlertDescription } from "#components2/ui/alert"
import { Badge } from "#components2/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components2/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components2/ui/tabs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScopeRegistryEntry = {
  scopeType: string
  label: string
  iconName: string
  module: string
  available: boolean
}

/** One dimension currently active in the scope rail — mirrors OperationalScopeRail data. */
export type ActiveScopeEntry = {
  scopeType: string
  selectedLabel: string | null
  source: "route" | "workflow" | "user" | "policy" | "default"
  authority: "user" | "admin" | "system"
  pinned: boolean
  displayOrder: number
}

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

const SCOPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  organization: Building2,
  project: FolderKanban,
  period: CalendarRange,
  team: Users,
  cost_center: Landmark,
  region: MapPin,
  warehouse: Warehouse,
  department: Users2,
  customer: Briefcase,
  contract: Landmark,
}

function ScopeIcon({
  scopeType,
  className,
}: {
  scopeType: string
  className?: string
}) {
  const Icon = SCOPE_ICONS[scopeType]
  if (!Icon) return <Circle className={className} />
  return <Icon className={className} />
}

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------

const SOURCE_LABEL: Record<string, string> = {
  route: "URL",
  workflow: "Workflow",
  user: "Pinned",
  policy: "Policy",
  default: "Default",
}

const SOURCE_CLASS: Record<string, string> = {
  route: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  workflow:
    "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  user: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  policy:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  default: "bg-muted text-muted-foreground border-border/50",
}

// ---------------------------------------------------------------------------
// Tab: Path — live mirror of the active scope rail
// ---------------------------------------------------------------------------

function PathTab({ activeScopes }: { activeScopes: ActiveScopeEntry[] }) {
  const sorted = [...activeScopes].sort(
    (a, b) => a.displayOrder - b.displayOrder
  )

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <Scale className="size-7 text-muted-foreground/40" strokeWidth={1.5} />
        <p className="text-xs font-medium text-muted-foreground">
          No active scope
        </p>
        <p
          className={cn(
            "max-w-[18rem] text-[11px] leading-snug text-muted-foreground/70",
            uiTracking.control
          )}
        >
          Set dimension policies in the Policy tab to make scope dimensions
          appear in the path bar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {sorted.map((scope) => {
        const hasValue =
          scope.selectedLabel !== null && scope.selectedLabel.length > 0
        const dimensionLabel = scope.scopeType.replace(/_/g, " ")
        const sourceCls = SOURCE_CLASS[scope.source] ?? SOURCE_CLASS.default
        const sourceLabel = SOURCE_LABEL[scope.source] ?? scope.source

        return (
          <div
            key={scope.scopeType}
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <ScopeIcon
              scopeType={scope.scopeType}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">
                {dimensionLabel}
              </p>
              <p
                className={cn(
                  "truncate text-xs",
                  hasValue
                    ? "font-medium text-foreground"
                    : "text-muted-foreground/60 italic"
                )}
              >
                {hasValue ? scope.selectedLabel : "Not set"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] leading-none font-medium",
                  sourceCls
                )}
              >
                {sourceLabel}
              </span>
              {hasValue ? (
                <CheckCircle2 className="size-3 text-emerald-500" />
              ) : (
                <Circle className="size-3 text-muted-foreground/30" />
              )}
            </div>
          </div>
        )
      })}

      <div className="px-4 py-2.5">
        <p
          className={cn(
            "text-[11px] leading-snug text-muted-foreground/60",
            uiTracking.control
          )}
        >
          Up to {SCOPE_RAIL_VISIBLE_LIMIT} dimensions shown simultaneously.
          Route-resolved dimensions appear automatically; user-pinned dimensions
          persist per session.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Policy — per-dimension allowed / mandatory / blocked
// ---------------------------------------------------------------------------

type ScopePolicyRowProps = {
  entry: ScopeRegistryEntry
  currentPolicy: OrgScopePolicy | null
  organizationId: string
}

function ScopePolicyRow({
  entry,
  currentPolicy,
  organizationId: _organizationId,
}: ScopePolicyRowProps) {
  const [isPending, startTransition] = useTransition()

  function handlePolicyChange(policy: string) {
    startTransition(async () => {
      await setOrgScopePolicyAction({
        scopeType: entry.scopeType,
        policy: policy as OrgScopePolicy,
        audience: "all",
        displayOrder: 0,
      })
    })
  }

  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
      aria-busy={isPending}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ScopeIcon
          scopeType={entry.scopeType}
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{entry.label}</span>
            {!entry.available ? (
              <Badge variant="secondary" className="text-[10px]">
                Reserved
              </Badge>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground/70">{entry.module}</p>
        </div>
      </div>

      <Select
        value={currentPolicy ?? "allowed"}
        onValueChange={handlePolicyChange}
        disabled={!entry.available || isPending}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="allowed" className="text-xs">
            Allowed
          </SelectItem>
          <SelectItem value="mandatory" className="text-xs">
            Mandatory
          </SelectItem>
          <SelectItem value="blocked" className="text-xs">
            Blocked
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function PolicyTab({
  registeredScopes,
  orgPolicies,
  organizationId,
}: {
  registeredScopes: ScopeRegistryEntry[]
  orgPolicies: OrgOperationalScopePolicyRow[]
  organizationId: string
}) {
  const policyByType = new Map(orgPolicies.map((p) => [p.scopeType, p]))

  return (
    <div className="flex flex-col gap-0">
      <Alert className="mx-4 mt-3 mb-0 border-amber-500/25 bg-amber-500/5">
        <Scale className="size-3.5 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
          Policy changes apply immediately to all users and are written to the
          audit ledger.
        </AlertDescription>
      </Alert>

      <div className="divide-y divide-border/40 px-4 py-3">
        {registeredScopes.map((entry) => (
          <ScopePolicyRow
            key={entry.scopeType}
            entry={entry}
            currentPolicy={
              (policyByType.get(entry.scopeType)?.policy as
                | OrgScopePolicy
                | undefined) ?? null
            }
            organizationId={organizationId}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Audience — role-based scope visibility (placeholder)
// ---------------------------------------------------------------------------

const AUDIENCE_PLACEHOLDER = [
  {
    id: "owner",
    label: "Owners",
    description: "Full path — all dimensions visible",
    locked: true,
  },
  {
    id: "admin",
    label: "Admins",
    description: "Configure per dimension below",
    locked: false,
  },
  {
    id: "member",
    label: "Members",
    description: "Configure per dimension below",
    locked: false,
  },
  {
    id: "guest",
    label: "Guests",
    description: "Scoped to shared project context only",
    locked: true,
  },
]

function AudienceTab() {
  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 py-3">
        <Alert className="border-border/50 bg-muted/30">
          <AlertDescription className="text-[11px] text-muted-foreground">
            Role-based scope visibility is planned for a future release.
            Configure which dimensions are shown per org role.
          </AlertDescription>
        </Alert>
      </div>

      <div className="divide-y divide-border/40 px-4 pb-3">
        {AUDIENCE_PLACEHOLDER.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{row.label}</p>
              <p className="text-[10px] text-muted-foreground/70">
                {row.description}
              </p>
            </div>
            {row.locked ? (
              <Lock className="size-3.5 shrink-0 text-muted-foreground/40" />
            ) : (
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] text-muted-foreground"
              >
                Soon
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Defaults — pre-set default scope selections (placeholder)
// ---------------------------------------------------------------------------

function DefaultsTab({
  registeredScopes,
}: {
  registeredScopes: ScopeRegistryEntry[]
}) {
  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 py-3">
        <Alert className="border-border/50 bg-muted/30">
          <AlertDescription className="text-[11px] text-muted-foreground">
            Default scope pre-sets let you specify fallback selections when a
            user has no active choice for a dimension. Coming in a future
            release.
          </AlertDescription>
        </Alert>
      </div>

      <div className="divide-y divide-border/40 px-4 pb-3">
        {registeredScopes
          .filter((e) => e.available)
          .map((entry) => (
            <div
              key={entry.scopeType}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <ScopeIcon
                  scopeType={entry.scopeType}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <p className="truncate text-xs font-medium">{entry.label}</p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground/50 italic">
                No default
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// OperationalScopeAdminConfigContent
// Embeddable inside DropdownMenuContent. Accepts active scope state so the
// Path tab mirrors the live scope rail in the utility bar.
// ---------------------------------------------------------------------------

type AdminConfigContentProps = {
  /** All scope definitions from the registry (RSC-built). */
  registeredScopes: ScopeRegistryEntry[]
  /** Current org policy rows (RSC-built). */
  orgPolicies: OrgOperationalScopePolicyRow[]
  organizationId: string
  /** Live scope dimensions from the utility bar rail — wires the Path tab. */
  activeScopes?: ActiveScopeEntry[]
}

export function OperationalScopeAdminConfigContent({
  registeredScopes,
  orgPolicies,
  organizationId,
  activeScopes = [],
}: AdminConfigContentProps) {
  return (
    <>
      {/* Standard header strip */}
      <div className="shrink-0 border-b border-border/50 px-4 py-3">
        <p className="text-xs font-semibold tracking-tight text-card-foreground">
          Scope policy
        </p>
        <p
          className={cn(
            "mt-1 text-[11px] leading-snug text-muted-foreground",
            uiTracking.control
          )}
        >
          Manage scope dimensions, policies, and audience rules for this
          organisation.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="path" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-8 shrink-0 justify-start gap-0 rounded-none border-b border-border/50 bg-transparent px-4">
          <TabsTrigger
            value="path"
            className="h-7 rounded-sm px-3 text-[11px] data-[state=active]:bg-muted/60 data-[state=active]:shadow-none"
          >
            Path
          </TabsTrigger>
          <TabsTrigger
            value="policy"
            className="h-7 rounded-sm px-3 text-[11px] data-[state=active]:bg-muted/60 data-[state=active]:shadow-none"
          >
            Policy
          </TabsTrigger>
          <TabsTrigger
            value="audience"
            className="h-7 rounded-sm px-3 text-[11px] data-[state=active]:bg-muted/60 data-[state=active]:shadow-none"
          >
            Audience
          </TabsTrigger>
          <TabsTrigger
            value="defaults"
            className="h-7 rounded-sm px-3 text-[11px] data-[state=active]:bg-muted/60 data-[state=active]:shadow-none"
          >
            Defaults
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="path"
          className="mt-0 min-h-0 flex-1 overflow-y-auto"
        >
          <PathTab activeScopes={activeScopes} />
        </TabsContent>

        <TabsContent
          value="policy"
          className="mt-0 min-h-0 flex-1 overflow-y-auto"
        >
          <PolicyTab
            registeredScopes={registeredScopes}
            orgPolicies={orgPolicies}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent
          value="audience"
          className="mt-0 min-h-0 flex-1 overflow-y-auto"
        >
          <AudienceTab />
        </TabsContent>

        <TabsContent
          value="defaults"
          className="mt-0 min-h-0 flex-1 overflow-y-auto"
        >
          <DefaultsTab registeredScopes={registeredScopes} />
        </TabsContent>
      </Tabs>
    </>
  )
}
