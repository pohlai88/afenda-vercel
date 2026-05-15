# ADR-0019 — ERP Operational Scope: execution context infrastructure

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-05-14 |
| **Supersedes** | Nothing — first treatment of operational scope resolution |
| **Does not supersede** | `neon_auth.session.activeOrganizationId` (identity/auth concern — untouched). `lib/features/erp-rbac/` permission gates (still the single authority for what a user *may do* inside one org). ADR-0009 generators. |
| **Implements in code** | `lib/erp/operational-context.shared.ts` · `lib/erp/operational-scope-registry.shared.ts` · `lib/erp/with-operational-context.server.ts` · `lib/features/operational-scope/` · `lib/db/schema.ts` (`orgOperationalScopePolicy`, `userOperationalScope`) · `drizzle/0038_operational_scope.sql` · `components2/stores/operational-scope.store.ts` · `components2/app-shell/operational-scope-rail.client.tsx` |
| **Related docs** | `AGENTS.md §5` (auth/IAM split) · `AGENTS.md §6` (directory contract) · `lib/features/erp-rbac/` · `lib/erp/crud-sap.shared.ts` · `lib/erp/audit-7w1h.server.ts` · ADR-0001 (spatial OS shell) |

---

## 1. Context

### 1.1 The real problem — operational execution context

Afenda targets multi-entity businesses: holding companies, investment groups, and
franchises that operate several subsidiary organisations. Every non-trivial ERP
action executes *within* a context:

```
current company  ·  current project  ·  current period
current plant    ·  current warehouse ·  current customer
current batch    ·  current production run
```

Without a resolved operational context, every Server Action, import job, approval
workflow, AI brief, and audit row must be scoped manually — and independently — by
every feature module. That is error-prone, duplicative, and unscalable.

This is **not** a "configurable utility bar" problem. It is ERP execution context
infrastructure — the same class of concern as the Temporal Spine (`lib/erp/temporal-spine.shared.ts`),
CRUD-SAP grammar (`lib/erp/crud-sap.shared.ts`), and the 7W1H audit shape
(`lib/erp/audit-7w1h.shared.ts`).

### 1.2 What Neon Auth already solves

`neon_auth.session.activeOrganizationId` governs **identity and permission scope**:
which org's `tenant_authority` applies, which ERP roles are active, which
`iam_audit_event` rows the user may write. This is the *auth plane* and must not be
stretched to carry operational context — that would require re-authenticating every
time a user changes their working warehouse or period.

### 1.3 What is explicitly not the tenant boundary

The org/company selector is a **tenant authority boundary**, not an operational
scope dimension. A user navigating between subsidiaries is crossing a security
boundary enforced by `requireOrgSession`. Treating org-switching as peer to
"select a project" creates dangerous mental models: org-switch changes permissions,
RBAC, and audit scope; project-select changes only the data filter.

Architecturally: org disc stays as a separate visual element. It is not one of the
operational scope pills.

### 1.4 Existing Afenda ERP layer precedent

| Concern | Neon Auth plane | Afenda ERP plane |
| --- | --- | --- |
| Org membership | `neon_auth.member` | (mirrors only; no write) |
| Business authorization | `neon_auth.member.role` (compat-only) | `tenant_authority` + `erp_role` + `erp_role_permission` |
| UI capability visibility | — | `org_capability_policy` + `user_capability_preference` |
| **Operational scope (new)** | — | **`org_operational_scope_policy` + `user_operational_scope`** (this ADR) |

---

## 2. Decision

### 2.1 Operational context as infrastructure, not UI state

```
DB
 ↓
resolveOperationalContext()          ← canonical server function, lib/features/operational-scope/
 ↓
route/workflow/user/policy/default   ← precedence merge
 ↓
ResolvedOperationalContext           ← attached to RouteEnvelope
 ↓
┌──────────┬──────────┬───────────────┬────────────┐
│  Actions │  Queries │  Audit rows   │  Shell UI  │
│  (scope) │  (scope) │  (inherited)  │  (pills)   │
└──────────┴──────────┴───────────────┴────────────┘
```

The shell visualization is a **read-only projection** of the resolved context.
Users interact with pills to express preferences, but the authoritative resolved
context comes from the server on every request. The Zustand store carries only
ephemeral UI state (popover open, search query, pending write flags) — no
authoritative context, no localStorage persistence.

### 2.2 Context precedence (highest wins)

| Priority | Source | Example |
| --- | --- | --- |
| 1 | **Route** | `/o/acme/projects/proj-a` → `project = proj-a` (auto-resolved without a click) |
| 2 | **Workflow** | Workflow DevKit run stamps its own scope on creation |
| 3 | **User explicit** | `user_operational_scope` row with `selectedId IS NOT NULL` |
| 4 | **Org policy mandate** | `org_operational_scope_policy.policy = 'mandatory'` forces a scope into every user's context |
| 5 | **Default** | `organizationId` from `requireOrgSession` — always present |

Auto-resolve aggressively. A user navigating to `/o/acme/projects/proj-a` should
never be asked to manually select "Project: proj-a" — the route already said it.

### 2.3 Semantic data model — no slot positions in the DB

**Rejected pattern:**
```ts
slotPosition: 1 | 2 | 3 | 4 | 5   // brittle — UI assumption baked into DB contract
```

**Adopted pattern:**
```ts
scopeType: "project" | "team" | "period" | ...  // semantic identity
displayOrder: number                              // rendering order — UI controls this
pinned: boolean                                  // user marked "always show in rail"
```

The DB is unbounded by design. The shell caps display at 5 visible pills with an
overflow affordance — that decision belongs to the UI layer, not the schema. This
future-proofs hidden dimensions, workflow-scoped dimensions, route-derived
dimensions, AI/operator-derived dimensions, and mobile compact mode without
requiring DB migrations.

### 2.4 Two new DB tables

Both app-owned, FK-less to `neon_auth.*` per the established convention (same as
`org_capability_policy`, `tenant_authority`, `user_capability_preference`).

#### `org_operational_scope_policy` — org admin control

One row per `(organizationId, scopeType, audience)`. Same shape as `org_capability_policy`.

```sql
organizationId   text NOT NULL
scopeType        text NOT NULL          -- registry-validated by Zod at write
policy           text NOT NULL          -- 'allowed' | 'mandatory' | 'blocked'
audience         text NOT NULL DEFAULT 'all'  -- 'all' | 'admin' | 'member'
displayOrder     integer NOT NULL DEFAULT 0
updatedByUserId  text NOT NULL
UNIQUE (organizationId, scopeType, audience)
```

#### `user_operational_scope` — user preference and current selection

One row per `(organizationId, userId, scopeType)`. The scope type, not the slot
position, is the unique key — position is determined by `displayOrder` at render
time.

```sql
organizationId  text NOT NULL
userId          text NOT NULL
scopeType       text NOT NULL          -- registry-validated by Zod at write
selectedId      text                   -- nullable: pinned but nothing chosen yet
selectedLabel   text                   -- denormalised; avoids join on render
selectedSlug    text                   -- optional URL-safe reference
displayOrder    integer NOT NULL DEFAULT 0
pinned          boolean NOT NULL DEFAULT false
UNIQUE (organizationId, userId, scopeType)
```

### 2.5 Registry-driven scope definitions — `lib/erp/operational-scope-registry.shared.ts`

A mutable singleton Map. Each ERP module registers its scope definition from its
`server.ts` barrel. `resolveOperationalContext()` reads from it to build the
resolved context, validate `scopeType` values, and supply the UI with icon and
label metadata.

```ts
export type OperationalScopeDefinition = {
  scopeType: string
  label: string
  iconName: string            // lucide icon name
  module: string              // lineage — which feature owns this
  available: boolean          // false = reserved/listed but disabled in admin UI
  routeMatcher?: (
    segments: ReadonlyArray<{ key: string; value: string }>
  ) => string | null          // auto-resolve from URL segments
}

export function registerOperationalScope(def: OperationalScopeDefinition): void
export function getRegisteredScopes(): ReadonlyMap<string, OperationalScopeDefinition>
export function getOperationalScopeDefinition(
  scopeType: string
): OperationalScopeDefinition | undefined
```

**v1 registrations** (made in `lib/features/operational-scope/server.ts`):

| `scopeType` | Label | Icon | Module | Route matcher |
| --- | --- | --- | --- | --- |
| `project` | Project | `FolderKanban` | `planner` | `/projects/[projectId]` segment |
| `period` | Period | `CalendarRange` | `planner` | — |
| `team` | Team | `Users` | `hrm` | — |
| `cost_center` | Cost centre | `Landmark` | `accounting` | — |
| `region` | Region | `MapPin` | `org` | — |
| `warehouse` | Warehouse | `Warehouse` | `inventory` | — |

Phase 2+ modules register their own scopes from their own `server.ts`. No central
catalog file to modify.

### 2.6 Canonical resolver — `resolveOperationalContext()`

Lives in `lib/features/operational-scope/server.ts` (exported as the feature's
public server door). Shared type contract in `lib/erp/operational-context.shared.ts`
so other `lib/erp/` primitives (e.g. `withOperationalContext`) can reference it
without feature imports.

```ts
// lib/erp/operational-context.shared.ts
export type ResolvedOperationalScope = {
  scopeType: string
  selectedId: string | null
  selectedLabel: string | null
  selectedSlug: string | null
  source: "route" | "workflow" | "user" | "policy" | "default"
  authority: "user" | "admin" | "system"
  pinned: boolean
  displayOrder: number
}

export type ResolvedOperationalContext = {
  organizationId: string
  userId: string
  scopes: Record<string, ResolvedOperationalScope>
  resolvedAt: string   // ISO timestamp
}
```

```ts
// lib/features/operational-scope/server.ts (server-only)
export async function resolveOperationalContext(input: {
  organizationId: string
  userId: string
  routeSegments?: ReadonlyArray<{ key: string; value: string }>
  workflowRunId?: string
}): Promise<ResolvedOperationalContext>
```

### 2.7 `lib/features/operational-scope/` module

Scaffolded via `pnpm gen capability --module operational-scope`. AGENTS.md §6
vocabulary:

```
lib/features/operational-scope/
  actions/
    user-scope.actions.ts           # pinScope, unpinScope, setUserScopeSelection (Tier B)
    admin-scope-policy.actions.ts   # setOrgScopePolicy (Tier A)
  data/
    operational-scope.queries.server.ts
  schemas/
    operational-scope.schemas.ts    # Zod: scopeType registry-validated, policy enum
  constants.ts                      # SCOPE_RAIL_VISIBLE_LIMIT = 5 (UI cap only)
  types.ts
  index.ts
  client.ts
  server.ts                         # resolveOperationalContext() + v1 scope registrations
  operational-scope.contract.ts
```

**Server Action tiers:**

| Action | Gate | CRUD-SAP | Tier | Audit string |
| --- | --- | --- | --- | --- |
| `pinScopeAction` | `requireOrgSession` | `update` | B | `erp.operational_scope.user_scope.update` |
| `unpinScopeAction` | `requireOrgSession` | `update` | B | `erp.operational_scope.user_scope.update` |
| `setUserScopeSelectionAction` | `requireOrgSession` | `update` | B | `erp.operational_scope.user_scope.update` |
| `setOrgScopePolicyAction` | `requireOrgSession` + `requireTenantAuthority("tenant_key_admin")` | `update` | A | `erp.operational_scope.org_policy.update` |

Admin policy change is **Tier A**: it immediately alters the operational context
for every user in the org — an org-wide durable change.

### 2.8 Audit enrichment — `withOperationalContext()`

Lives in `lib/erp/with-operational-context.server.ts`. A pure function: no DB
access, no feature imports — valid for `lib/erp/`.

```ts
export function withOperationalContext<T extends Record<string, unknown>>(
  context: ResolvedOperationalContext,
  metadata: T,
): T & { operationalContext: Record<string, string | null> }
```

Usage in any Server Action:

```ts
await writeIamAuditEventFromNextHeaders({
  action: "erp.inventory.transfer.record.create",
  organizationId,
  actorUserId: userId,
  resourceType: "inventory.transfer",
  resourceId: row.id,
  metadata: withOperationalContext(operationalContext, {
    transferKind: parsed.data.kind,
  }),
})
```

Every audit row, workflow run, and AI brief inherits resolved context automatically.
Feature modules do not wire scope separately — they call `withOperationalContext`
and the resolver has already done the work.

### 2.9 Shell visualization — `operational-scope-rail.client.tsx`

The shell component is a **read-only projection** of `ResolvedOperationalContext`.

**Calm-shell rules** baked in:

1. Only render scopes where `pinned = true` OR `source = "route"` OR `source = "workflow"`. Implicit resolved scopes stay hidden — never clutter the rail.
2. Hard visual cap at 5 pills; overflow goes into a `MoreHorizontal` popover.
3. A `Badge variant="secondary"` shows `"route"` or `"workflow"` source so the user understands why a scope appears without selecting it.
4. An **"Add scope +"** ghost pill appears only when the user has fewer pinned scopes than the org policy `maxUserScopeItems` (default 3).

The Zustand store (`components2/stores/operational-scope.store.ts`) carries only:
- `openPopoverScopeType: string | null` — which pill is open
- `searchQuery: string` — entity search text
- `pendingWrites: Set<string>` — optimistic in-flight writes

**No `persist` middleware. No localStorage.** The server resolver is truth on every
navigation. Optimistic writes are cleared when the RSC re-renders with fresh data.

---

## 3. Rejected alternatives

### 3.1 Option A — Slot-position DB model

Using `slotPosition: 1 | 2 | 3 | 4 | 5` as the DB identity key.

**Rejected:** encodes UI layout assumptions in the schema. Future needs (hidden
dimensions, workflow-scoped dimensions, AI-derived context, mobile compact mode)
require DB migrations. Semantic identity (`scopeType`) is stable across layout
changes.

### 3.2 Option B — Org hierarchy schema

Adding `parentOrganizationId` to `neon_auth.organization` or an `org_hierarchy`
bridge table.

**Rejected:** `neon_auth.organization` is Neon Auth–owned. A bridge table requires
every ERP query to join it — a cross-cutting refactor with no incremental path.
Hierarchy is a structural concept; operational scope is a view-context concept.
Hierarchy can be layered on top in Phase 2 — the `resolveOperationalContext` API
remains stable (`resolveOrgScopeIds` can walk the hierarchy table without callers
changing).

### 3.3 Option C — localStorage-persisted Zustand store

Using the same persist pattern as `utility-bar.store.ts` for operational context.

**Rejected:** operational scope affects data queries, approvals, reports, and audit
rows — not just icon visibility. localStorage can drift from revoked access, org
changes, or role changes. ERP context must come from a trusted server source on
every request.

---

## 4. RBAC and CRUD-SAP implications

### 4.1 RBAC

`requireErpPermission` remains keyed to the **auth org**. The operational context
is a *filter* on top of org-scoped data, not a permission expansion. A user cannot
resolve scopes for a `scopeType` unless the org policy `policy = 'allowed'` or
`'mandatory'` for their audience.

Cross-org aggregate views (Phase 2) require `neon_auth.member` membership in each
target org — `resolveOperationalContext` validates this before returning cross-org
scope IDs.

### 4.2 CRUD-SAP grammar

Operational scope mutations use verb `update` — they update the user's working
context or the org's policy state.

Audit strings defined in `operational-scope.contract.ts`:

```
erp.operational_scope.user_scope.update    — Tier B  (pin, unpin, selection change)
erp.operational_scope.org_policy.update    — Tier A  (admin sets org scope policy)
```

`metadata` for user scope updates: `{scopeType, selectedId, previousSelectedId, pinned}`.
`metadata` for org policy updates: `{scopeType, policy, audience, previousPolicy}`.
No PII in either.

---

## 5. Consequences

### What changes

- New Drizzle migration: `org_operational_scope_policy` + `user_operational_scope` tables.
- New `lib/erp/operational-context.shared.ts` — shared type contract.
- New `lib/erp/operational-scope-registry.shared.ts` — registry + `registerOperationalScope`.
- New `lib/erp/with-operational-context.server.ts` — audit enrichment helper.
- New `lib/features/operational-scope/` module — resolver, DB access, Server Actions, v1 scope registrations.
- New `components2/stores/operational-scope.store.ts` — UI-ephemeral store (no persist).
- New `components2/app-shell/operational-scope-rail.client.tsx`.
- New `components2/app-shell/operational-scope-admin-config.client.tsx`.
- `lib/route-envelope.shared.ts` — `operationalContext?: ResolvedOperationalContext | null` added to `RouteEnvelope`.
- `components2/stores/index.ts` — exports `useOperationalScopeUiStore`.
- `app/[locale]/o/[orgSlug]/layout.tsx` — calls `resolveOperationalContext()`, attaches to envelope.

### What does not change

- `neon_auth.*` schema — untouched.
- `requireOrgSession` / `requireErpPermission` — unchanged.
- All existing ERP data queries — unchanged; opt-in only via `withOperationalContext`.
- `utility-bar.store.ts` / right rail — unchanged.
- URL routing — no new routes.

### Future phases

- **Phase 2:** `org_hierarchy (parentOrgId, childOrgId)` for holding-company aggregates. `resolveOperationalContext` enhanced; no consumer API change.
- **Phase 2:** `cost_center`, `region` scope registrations (accounting + org-settings modules).
- **Phase 3:** `warehouse`, `channel` registrations (inventory, commerce).
- **Phase 3:** `requireCrossOrgReadPermission` gate for explicit cross-org grants beyond membership.
- **Phase 4:** Workflow DevKit integration — durable runs stamp their own operational context at creation; `resolveOperationalContext` reads it at `priority = 2`.
