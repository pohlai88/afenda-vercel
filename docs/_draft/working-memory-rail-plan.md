# Working Memory Rail — design + execution plan (Draft v1)

> **Status:** Draft, awaiting greenlight. Not an ADR yet — promote to `docs/decisions/0009-working-memory-rail.md` once Phase 1 lands and the slot model is locked.
>
> **Authors:** Workbench team (rail audit, 2026-05-12)
>
> **Scope:** `components/workbench/left-nav-rail/` schema + UI + rail-slot builders + per-user persistence.
>
> **Anchors:** ADR-0001 (Spatial OS L1–L4), ADR-0005 (canonical Workbench shell), `AGENTS.md` §5 Nexus runtime + IAM audit policy + locale-first surface, `.cursor/rules/shell-directory.mdc`, `.cursor/rules/frontend-quality-contract.mdc` §11.

---

## 1. Diagnosis — why the current rail is decorative chrome

The rail's `identity.pills`, `labels.description`, and `context: ContextStrip[]` were built as **generic slots** before anyone asked what operator question they answer. Each rail-slot builder filled them with whatever data lay around. On `/account/*` the slot content reads:

| Element | Source | Earns its place? |
|---|---|---|
| Description "Persistent personal operating context for identity, sessions, security, and workspace movement." | `messages/en.json` → `Account.rail.description` | **No.** Marketing filler. |
| Pill: "Verified" / "Verification pending" | `summary.emailVerified` | **No.** Duplicates "Verification" strip item below. |
| Pill: "Demo Organization · owner" | `summary.activeOrgName + role` | Partial. Tenancy at-a-glance, but duplicates "Active workspace" strip. |
| Strip: "Active workspace = Demo Organization" | `recentContexts[0]` | **No.** Duplicates pill. |
| Strip: "Latest security change = …" | `recentContexts[1]` | **Yes.** Conditional + linkable. |
| Strip: "Recent evidence = …" | `recentContexts[2]` | **Yes.** Conditional + linkable. |
| Strip: "Verification = Ready" | `signals[0]` | **No.** Duplicates pill. Silent positive state. |
| Strip: "Session count = 50 active sessions" | `signals[1]` | Partial. `href: undefined` — number with no path to action. |
| Strip: "Access health = Ready" | `signals[2]` | **No.** Tautology — non-Ready states only render on `/console`. |

**Score:** ~3 of 8 context-region elements answer an operator question. The rest is dashboard cosplay on a personal-settings surface.

### Root cause

The schema is too permissive. `identity.pills` and `context: []` were exposed as **API**, so every builder felt obligated to fill them. None of those slots passed the doctrine test (`shell-directory.mdc`):

> *"Operator can see what deserves attention now and route execution safely."*

A pill saying "Verified" is not attention. "Access health = Ready" is not movement. They are chrome.

There is also a routing reason: operational pressure belongs on **Nexus** (ADR-0005 + AGENTS §5 — Nexus runtime), not on rails. Trying to manufacture pressure on a settings surface produced the tautologies.

### Governance kernel — the structural fix

The *procedural* fix (delete pills / context / description) is easy. The *structural* fix is what prevents the next agent from re-introducing the same chrome under a different name six months later. The fix has three parts, validated against Next.js App Router doctrine (context7 `/vercel/next.js` — typed-slot RSC composition + `@next/codemod` cross-cutting refactors):

1. **Shell schema is the only governance point.** `components/workbench/left-nav-rail/workbench-rail.schema.ts` is the single source of truth for rail shape. All type surfaces (`workbench-rail.types.ts`) are `z.infer<>` from it; the renderer (`workbench-rail.tsx`) consumes the inferred slots; every per-workbench builder returns slots that conform. **Adding a new rail slot / identity field / label requires extending the schema first.** Builders may not synthesize fields the schema does not declare.
2. **Per-workbench rail-slot builders are pure mappers.** They take domain data in, return schema-shaped slot data out. They do not own chrome decisions, do not invent fields, and do not duplicate work the shell already performs (e.g., the shell already renders the footer — no builder emits "Online" status text).
3. **Cross-cutting structural sweeps use codemods.** Any time a shell-schema change affects ≥ 3 consumer call sites, ship a `ts-morph` codemod at `scripts/refactors/<YYYY-MM-DD>-<slug>.ts` instead of editing call sites by hand. Mirrors how Next.js itself ships breaking shell changes via `@next/codemod` (`next-async-request-api`, `middleware-to-proxy`, etc.). The codemod is the documentation of the transform.

This principle generalizes to **utility bar slots**, **dock items**, **command runtime intents**, and **Nexus zones** as those surfaces formalize. Phase 1 enacts the schema deletion + first codemod + rule codification; Phase 2 enforces semantic pressure by making `badge.tone` schema-required (a second kernel mutation); Phase 3a extends the kernel with the four memory slots via the second codemod.

---

## 2. Cross-product pattern map (state-of-the-art rails)

| Slot | Premium products that have it | Operator question it answers |
|---|---|---|
| Identity anchor | Linear, Notion, GitHub, Vercel | "Who am I right now?" |
| Segment nav with pressure counts | All premium products | "What's the work surface, where's the pressure?" |
| Inbox | Linear (Triage), Notion (Inbox), GitHub (Notifications) | "What needs **me** right now?" |
| **Operator-authored views** | **Linear (custom views)**, GitHub (saved queries), Notion (databases) | "What queries do I run **repeatedly**?" |
| **Pinned items** | **Notion (Favorites)**, GitLab (pinned), Tana (pins) | "Which records am I **currently working with**?" |
| **Recents** (activity-derived) | **GitHub (Top Repositories)**, Notion (Recents), Cursor | "Where was I **just at**?" |
| Status pills ("Verified", "Ready") | **Nobody premium** | n/a — chrome cosplay |
| Generic description text | **Nobody premium** | n/a — chrome cosplay |
| Tautological context strips | **Nobody premium** | n/a — chrome cosplay |

Sources: Linear UI refresh changelog (Mar 2026), Notion Sidebar Help, GitHub navigation redesign blog, Vercel 2026 admin-dashboard experiment, Raycast / Cursor as operating systems writeups, GitLab pinned-items issue.

### What this means for Afenda specifically

Your L1 utility bar already separates concerns better than most premium products:

```
L1 left   = tenancy switcher        (matches Notion / Linear / Vercel — table stakes)
L1 right  = unlimited widget board  (NOVEL — most products don't have this)
L2 rail   = ???                     (today: nav + decorative chrome)
L3 cmd    = command palette         (intent → action)
L4 dock   = persistent execution    (matches macOS dock metaphor)
```

The L2 rail's remaining job is what no premium SaaS has cleanly: **per-workbench operator working memory**. Not tenancy (L1), not widgets (L1), not intent (L3), not execution (L4). The local memory of *"this workbench, this operator, right now"*.

---

## 3. Wireframes

### 3.1 `/account/*` — BEFORE (today, the chrome-as-information state)

```
┌──────────────────────────────────────────┐
│  ╭───╮                                   │
│  │AF │  Afenda Operator                  │
│  ╰───╯  operator@afenda.dev              │
│         Persistent personal operating    │  ← marketing filler
│         context for identity, sessions,  │
│         security, and workspace movement.│
│                                          │
│         [Verified]  [Demo Org · owner]   │  ← decorative pills
├──────────────────────────────────────────┤
│  CONTEXT                                 │
│    Active workspace    Demo Organization │  ← duplicates pill above
│    Verification        Ready             │  ← duplicates pill above
│    Session count       50 active sessions│  ← unlinkable number
│    Access health       Ready             │  ← tautology
├──────────────────────────────────────────┤
│   ◉  Identity                            │
│   ◯  Orbit                               │  ← no pressure signal
│   ◯  Sessions                            │
│   ◯  Security                            │
│   ◯  Workspace                           │
├──────────────────────────────────────────┤
│   Sign out                               │
├──────────────────────────────────────────┤
│   ●  Online · secure session             │
├──────────────────────────────────────────┤
│   ‹                                      │
└──────────────────────────────────────────┘
```

### 3.2 `/account/*` — AFTER Phase 1 (calm honest density)

```
┌──────────────────────────────────────────┐
│  ╭───╮                                   │
│  │AF │  Afenda Operator                  │
│  ╰───╯  operator@afenda.dev              │
├──────────────────────────────────────────┤
│   ◉  Identity                            │
│   ◯  Orbit                          3    │  ← real pressure (open signals)
│   ◯  Sessions                            │
│   ◯  Security                       !    │  ← real pressure (unfamiliar device)
│   ◯  Workspace                           │
├──────────────────────────────────────────┤
│   Latest security change                 │  ← KEPT — conditional + linkable
│   New passkey from MacBook Pro · 2h ago  │
├──────────────────────────────────────────┤
│   Sign out                               │
├──────────────────────────────────────────┤
│   ●  Online · secure session             │
├──────────────────────────────────────────┤
│   ‹                                      │
└──────────────────────────────────────────┘
```

Personal IAM surface has no operational pressure to manufacture — rail stays sparse. Only the **conditional + linkable** "Latest security change" survives from the old context strip.

### 3.3 `/o/{slug}/dashboard/hrm/*` — AFTER Phase 1+2 (chrome stripped + nav badges live)

```
┌──────────────────────────────────────────┐
│  ╭───╮                                   │
│  │AF │  Afenda Operator                  │
│  ╰───╯  operator@afenda.dev              │
├──────────────────────────────────────────┤
│   HRM                                    │
│                                          │
│   ◉  Overview                            │
│   ◯  Employees                    247    │  ← total (default tone)
│   ◯  Approvals                      3    │  ← pressure (attention tone)
│   ◯  Payroll                             │
│   ◯  Leave types                         │
│   ◯  Attendance                          │
├──────────────────────────────────────────┤
│   Sign out                               │
├──────────────────────────────────────────┤
│   ●  Online · secure session             │
├──────────────────────────────────────────┤
│   ‹                                      │
└──────────────────────────────────────────┘
```

### 3.4 `/o/{slug}/dashboard/hrm/*` — AFTER Phase 3 (full Working Memory Rail, busy operator)

```
┌──────────────────────────────────────────┐
│  ╭───╮                                   │
│  │AF │  Afenda Operator                  │
│  ╰───╯  operator@afenda.dev              │
├──────────────────────────────────────────┤
│   ▣  Inbox                  3 pending  →│  ← linkable pressure summary
├──────────────────────────────────────────┤
│   HRM                                    │
│                                          │
│   ◉  Overview                            │
│   ◯  Employees                    247    │
│   ◯  Approvals                      3    │  ← matches inbox count
│   ◯  Payroll                             │
│   ◯  Leave types                         │
│   ◯  Attendance                          │
├──────────────────────────────────────────┤
│   VIEWS                              +   │  ← operator-authored saved filters
│                                          │
│   ◇  New hires this month          12   │
│   ◇  Contracts expiring 30d         4   │
│   ◇  Probation review due           2   │
├──────────────────────────────────────────┤
│   PINNED                                 │  ← per-user persisted records
│                                          │
│   ☆  Sarah Chen                          │
│   ☆  Q3 payroll review                   │
├──────────────────────────────────────────┤
│   RECENT                                 │  ← activity-derived, capped 5
│                                          │
│   ·  Marcus Tan          5m ago          │
│   ·  Leave policy 2026   1h ago          │
│   ·  Sarah Chen          yesterday       │
├──────────────────────────────────────────┤
│   Sign out                               │
├──────────────────────────────────────────┤
│   ●  Online · secure session             │
├──────────────────────────────────────────┤
│   ‹                                      │
└──────────────────────────────────────────┘
```

### 3.5 Same `/hrm/*` rail — AFTER Phase 3, FRESH operator (no pinned, views, recents yet)

```
┌──────────────────────────────────────────┐
│  ╭───╮                                   │
│  │AF │  Afenda Operator                  │
│  ╰───╯  operator@afenda.dev              │
├──────────────────────────────────────────┤
│   HRM                                    │
│                                          │
│   ◉  Overview                            │
│   ◯  Employees                    247    │
│   ◯  Approvals                           │  ← count = 0 → badge hides
│   ◯  Payroll                             │
│   ◯  Leave types                         │
│   ◯  Attendance                          │
├──────────────────────────────────────────┤
│   Sign out                               │
├──────────────────────────────────────────┤
│   ●  Online · secure session             │
├──────────────────────────────────────────┤
│   ‹                                      │
└──────────────────────────────────────────┘
```

**Conditional density is the architectural property.** Empty slots disappear — no `Views (0)` ghost frames. Operator state and rail density move in lockstep. This is what no premium SaaS gets right.

### 3.6 Collapsed mode (any workbench)

```
┌──────┐
│ ╭──╮ │
│ │AF│ │   ← identity monogram (tooltip = name + email + tenancy)
│ ╰──╯ │
├──────┤
│ ▣ 3  │   ← inbox badge (only if count > 0)
├──────┤
│ ◯    │   ← Overview
│ ◉    │   ← Employees (active)
│ ◯  3 │   ← Approvals (pressure)
│ ◯    │   ← Payroll
│ ◯    │   ← Leave types
│ ◯    │   ← Attendance
├──────┤
│ ⎋    │   ← Sign out (icon only)
├──────┤
│  ●   │   ← online dot
├──────┤
│  ›   │   ← expand
└──────┘
```

Collapsed keeps pressure (badges + dots) and hides everything that needs words. Views / pinned / recents drop below 72px — they live in their full surface when the operator expands. Tooltips on hover for every nav item (already wired in `workbench-rail-nav-item.tsx` via `WorkbenchRailTooltip`).

---

## 4. Schema diff (Zod)

```diff
 export const workbenchRailIdentitySchema = z.object({
   initial: z.string().trim().min(1).max(3),
   primary: z.string().trim().min(1),
   secondary: z.string().trim().optional(),
-  pills: z.array(workbenchRailIdentityPillSchema).optional(),
   href: z.string().trim().optional(),
 })

 export const workbenchRailLabelsSchema = z.object({
   ariaLabel: z.string().min(1),
-  description: z.string().optional(),
   collapseLabel: z.string().min(1),
   expandLabel: z.string().min(1),
   emptyState: z.string().optional(),
 })

 export const workbenchRailSlotsDataSchema = z.object({
   identity: workbenchRailIdentitySchema,
   nav: z.array(workbenchRailNavSectionSchema),
-  context: z.array(workbenchRailContextStripSchema).optional(),
+  inbox: workbenchRailInboxSchema.optional(),
+  views: z.array(workbenchRailViewSchema).optional(),
+  pinned: z.array(workbenchRailPinSchema).optional(),
+  recents: z.array(workbenchRailRecentSchema).optional(),
 })

+export const workbenchRailInboxSchema = z.object({
+  label: z.string().trim().min(1),
+  count: z.number().int().nonnegative(),
+  href: z.string().trim().min(1),
+  tone: workbenchRailBadgeToneSchema.default("attention"),
+})
+
+export const workbenchRailViewSchema = z.object({
+  id: z.string().trim().min(1),
+  label: z.string().trim().min(1),
+  href: z.string().trim().min(1),
+  icon: workbenchRailNavIconIdSchema.optional(),
+  badge: workbenchRailNavBadgeSchema.optional(),
+})
+
+export const workbenchRailPinSchema = z.object({
+  id: z.string().trim().min(1),
+  label: z.string().trim().min(1),
+  href: z.string().trim().min(1),
+  icon: workbenchRailNavIconIdSchema.optional(),
+})
+
+export const workbenchRailRecentSchema = z.object({
+  id: z.string().trim().min(1),
+  label: z.string().trim().min(1),
+  href: z.string().trim().min(1),
+  occurredAt: z.string().datetime(),
+  icon: workbenchRailNavIconIdSchema.optional(),
+})
```

**Dies cleanly:** `workbenchRailIdentityPillSchema`, `workbenchRailContextStripSchema`, `workbenchRailContextStripItemSchema`. Their consumers (rail-slot builders, message keys, parity tests) get deleted in the same PR.

---

## 5. Phase 3 DB tables (Drizzle)

```sql
-- drizzle/0011_rail_working_memory.sql

CREATE TABLE "rail_pinned_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "workbench_id" text NOT NULL,           -- "account" | "org-admin" | "hrm" | "platform-admin" | "<module>"
  "resource_type" text NOT NULL,           -- "hrm_employee" | "neon_auth_user" | …
  "resource_id" uuid NOT NULL,
  "label" text NOT NULL,                   -- snapshot label (survives renames gracefully)
  "href" text NOT NULL,                    -- snapshot href
  "icon" text,                             -- NavIconId
  "rank" integer NOT NULL DEFAULT 0,       -- drag-to-reorder
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "rail_pinned_item_user_resource_unique"
  ON "rail_pinned_item" ("organization_id", "user_id", "workbench_id", "resource_type", "resource_id");
CREATE INDEX "rail_pinned_item_lookup"
  ON "rail_pinned_item" ("organization_id", "user_id", "workbench_id", "rank");

CREATE TABLE "rail_saved_view" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "workbench_id" text NOT NULL,
  "label" text NOT NULL,
  "href" text NOT NULL,                    -- filtered URL ?status=...&assignee=...
  "icon" text,
  "rank" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "rail_saved_view_lookup"
  ON "rail_saved_view" ("organization_id", "user_id", "workbench_id", "rank");

CREATE TABLE "rail_recent_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "workbench_id" text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" uuid,
  "label" text NOT NULL,
  "href" text NOT NULL,
  "icon" text,
  "occurred_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "rail_recent_item_lookup"
  ON "rail_recent_item" ("organization_id", "user_id", "workbench_id", "occurred_at" DESC);
-- App-side cap: 5 surfaced, 25 retained, cron prunes beyond that.
```

Org-scoped + user-scoped + workbench-scoped. Cascade on org delete. Unique constraint prevents duplicate pins. Recents have a soft cap (DB query limits to 5; cron prunes beyond 25).

---

## 6. IAM audit strings (Phase 3 — new)

```
iam.workbench.pin.create       -- operator pins a record
iam.workbench.pin.delete       -- operator unpins
iam.workbench.pin.reorder      -- drag-to-reorder pinned list
iam.workbench.view.create      -- operator saves filtered URL as named view
iam.workbench.view.delete
iam.workbench.view.update      -- rename or change filter URL
```

`iam.*` namespace per AGENTS §5 — personal operator state, not ERP business state. Gate: `requireOrgSession` (Tier B). Resource types: `rail_pinned_item`, `rail_saved_view`. `rail_recent_item` writes are **not** audited (high-frequency activity stream; audit volume would dwarf legitimate IAM events — track via OTEL counter instead).

---

## 7. Per-workbench slot allocation

| Workbench | identity | nav | inbox | views | pinned | recents |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `/account/*` | ✓ | ✓ | — | — | — | optional (recent security events) |
| `/o/{slug}/admin` | ✓ | ✓ | pending invitations + audit alerts | audit saved queries | pinned members | recent admin actions |
| `/o/{slug}/dashboard/hrm` | ✓ | ✓ | leave approvals + contract renewals | employee filters | pinned employees | recent employees viewed |
| `/operator/*` | ✓ | ✓ | escalations | user saved queries | pinned users | recent admin actions |
| `/o/{slug}/dashboard/<module>` | ✓ | ✓ | module-specific | record list views | pinned records | recent records |

`/account/*` stays sparse because **a personal settings surface has no operational pressure** — doctrinal answer to "why is `Access health = Ready` tautological?" The ERP workbenches get the full memory toolkit because they're where operators spend hours.

---

## 8. File-level execution plan

### Phase 1 — Strip the chrome (one PR, ~12 files, pure subtraction)

| File | Delta |
|---|---|
| `components/workbench/left-nav-rail/workbench-rail.schema.ts` | Remove `workbenchRailIdentityPillSchema`, `workbenchRailContextStripSchema`, `workbenchRailContextStripItemSchema`; remove `pills` from identity, `context` from slots, `description` from labels |
| `components/workbench/left-nav-rail/workbench-rail.tsx` | Drop context-strip render block, drop description prop |
| `components/workbench/left-nav-rail/workbench-rail-identity.tsx` | Drop pills + description render |
| `components/workbench/left-nav-rail/workbench-rail-context-strip.tsx` | **Delete file** |
| `components/workbench/left-nav-rail/workbench-rail.types.ts` | Drop re-exports of dead types |
| `components/workbench/left-nav-rail/index.ts` | Drop barrel exports of context strip types |
| `app/[locale]/(iam)/account/_components/account-rail-slots.ts` | Drop pills + context emission; keep "Latest security change" as a single optional conditional slot (decide: as nav badge, dedicated single-item slot, or drop entirely) |
| `app/[locale]/(iam)/account/_components/account-shell.types.ts` | Drop `AccountSignal`, `AccountRecentContext` if unused after the above |
| `app/[locale]/(iam)/account/layout.tsx` | Drop `recentContexts` / `signals` construction |
| `lib/features/hrm/data/hrm-rail-slots.ts` | Drop pills + context emission |
| `lib/features/org-admin/data/org-admin-rail-slots.ts` | Drop pills + context emission |
| `lib/features/platform-admin/data/platform-admin-rail-slots.ts` | Drop pills + context emission |
| `messages/en.json` | Drop `account.rail.description`, `account.recent.*`, `account.signals.*`, plus HRM/org-admin/platform-admin equivalents |
| `tests/fixtures/*` | Drop fixtures referencing pills/context |
| `tests/unit/workbench-rail.dom.test.tsx` | Update `baseSlots` to remove pills + context; update 8 existing schema tests; add empty-context regression test |
| `tests/unit/fixtures-i18n-parity.test.ts` | Auto-passes once stale keys are gone |

**Net effect:** ~−250 LOC, +60 LOC test updates, +0 LOC product code. Pure subtraction.

**Verification gates:** `pnpm typecheck`, `pnpm exec vitest run tests/unit/workbench-rail.dom.test.tsx tests/unit/fixtures-i18n-parity.test.ts`, `pnpm lint`.

### Phase 2 — Pressure badges on nav (one PR per workbench, ~4 files each)

Repeating template:

| File | Delta |
|---|---|
| `lib/features/<module>/data/<module>-rail-pressure.queries.server.ts` | New: `getRailPressureCounts(orgId)` → `{ approvalsOpen, invitesPending, … }` |
| `lib/features/<module>/data/<module>-rail-slots.ts` | Take pressure counts as param; inject `badge: { count, tone }` per nav item |
| `app/[locale]/o/[orgSlug]/.../layout.tsx` | Add `getRailPressureCounts(orgId)` to Tier B `Promise.all` |
| `tests/e2e/<workbench>-rail-pressure.spec.ts` | Seed pending record, assert `aria-label` on nav item contains count |

**Roll order:** org admin → HRM → platform admin → per-ERP-module (whichever has obvious pressure first). Each PR shippable independently.

### Phase 3 — Working Memory Rail (multi-PR)

**PR 3a — Schema + DB: ✅ Complete (2026-05-12).** Shipped:
- `drizzle/0023_rail_working_memory.sql` (next free migration index — corrected from the original `0011_*` placeholder) creates `rail_pinned_item`, `rail_saved_view`, `rail_recent_item` (text PK / `crypto.randomUUID()`, `text` columns for org / user / workbench IDs per the repo's FK-less cross-schema convention — same pattern as `iam_audit_event`, `planner_signal`). Unique pin-per-resource constraint; lookup indexes on `(organizationId, userId, workbenchId, …)`.
- `drizzle/meta/_journal.json` adds idx 23, tag `0023_rail_working_memory`.
- `lib/db/schema.ts` exports `railPinnedItem`, `railSavedView`, `railRecentItem` (camelCase columns, `mode: "date"` timestamps).
- `components/workbench/left-nav-rail/workbench-rail.schema.ts`:
  - 4 new strict Zod schemas: `workbenchRailInboxSchema`, `workbenchRailPinSchema`, `workbenchRailViewSchema`, `workbenchRailRecentSchema`.
  - 4 new parsers: `parseWorkbenchRailInbox`, `parseWorkbenchRailPin`, `parseWorkbenchRailView`, `parseWorkbenchRailRecent`.
  - `workbenchRailSlotsDataSchema` extended with optional `inbox`, `pinned`, `views`, `recents`. **Kernel-level conditional density:** `inbox.count` must be ≥ 1, and `pinned` / `views` / `recents` arrays must be non-empty (`recents` is also capped at 5). Empty memory must be expressed by omitting the slot key — the schema refuses placeholder shapes that would render as decorative "Pinned (0)" chrome.
- `components/workbench/left-nav-rail/workbench-rail.types.ts` derives `WorkbenchRailInbox` / `WorkbenchRailPin` / `WorkbenchRailView` / `WorkbenchRailRecent`; `WorkbenchRailSlots` automatically inherits the new optional slot fields.
- `components/workbench/left-nav-rail/index.ts` + `components/workbench/index.ts` re-export every new symbol so Phase 3b/3c builders can import them via `#components/workbench` without deep-importing the rail folder.
- `tests/unit/workbench-rail.dom.test.tsx` adds 15 parser tests covering positive shape, kernel-level conditional density (`count = 0`, empty arrays, > 5 recents), strict-key rejection, optional icon, and the list-level recent variant without `resourceId`.
- Gates: `pnpm lint:drizzle-journal`, `pnpm typecheck`, targeted Vitest, full `pnpm lint`. UI rendering of the new slots is intentionally out of scope for 3a — `WorkbenchRail` ignores any `inbox` / `pinned` / `views` / `recents` slot data until 3c lands the renderers.

**PR 3b — Generic rail-memory module** (new feature module under AGENTS §6 shape):
- `lib/features/rail-memory/{actions,data,schemas,types.ts,index.ts}`
- Server Actions: `pinRecordAction`, `unpinRecordAction`, `reorderPinsAction`, `saveViewAction`, `deleteViewAction`, `updateViewAction`
- Queries: `listPinnedForUser(orgId, userId, workbenchId)`, `listSavedViewsForUser(...)`, `listRecentsForUser(...)`, `recordRecentVisit(...)`
- IAM audit writers wired (6 new actions)
- Coverage: unit tests for Zod parsers + query shape; Playwright for pin/unpin flow

**PR 3c — UI sections:**
- `components/workbench/left-nav-rail/workbench-rail-inbox.tsx`
- `components/workbench/left-nav-rail/workbench-rail-views-section.tsx`
- `components/workbench/left-nav-rail/workbench-rail-pinned-section.tsx`
- `components/workbench/left-nav-rail/workbench-rail-recents-section.tsx`
- `components/workbench/left-nav-rail/workbench-rail.tsx` — compose conditionally
- DOM tests: each section visible when data present, hidden when empty/collapsed

**PR 3d — Reference wiring (org admin first):**
- `lib/features/org-admin/data/org-admin-rail-slots.ts` — call `listPinnedForUser` etc.; shape `inbox` from pending invitations + audit failures
- `app/[locale]/o/[orgSlug]/admin/layout.tsx` — `Promise.all` the 4 memory queries
- "Save view" + "Pin" affordances appear on org admin members/audit list surfaces
- IAM audit Playwright assertions

**PR 3e — Roll to other workbenches:** HRM → platform admin → per-module ERP. One PR each. Same template as 3d.

**PR 3f — Promote to ADR:** Author `docs/decisions/0009-working-memory-rail.md` (single doc covering the doctrine across all workbenches). Move this draft to `docs/_draft/working-memory-rail-plan.md.original.md` (or delete).

---

## 9. Cost summary

| Phase | Files | LOC ∆ | Time | Risk |
|---|---|---|---|---|
| 1 — Strip | 12 | −250 / +60 | ~1 h | Very low (subtractive, tests cover it) |
| 2 — Pressure (per workbench) | 4 × 4 = 16 | +400 | ~3 h total | Low (additive, opt-in) |
| 3a — Schema + DB | 5 | +180 | ~2 h | Low |
| 3b — `rail-memory` module + actions | 14 | +420 | ~4 h | Medium (IAM audit + tests) |
| 3c — UI sections | 6 | +350 | ~3 h | Low |
| 3d — Org admin reference | 5 | +220 | ~2 h | Medium (integration) |
| 3e — Roll to 3 workbenches | 12 | +600 | ~6 h | Low (repeat) |
| 3f — ADR-0009 | 1 | +200 (doc) | ~30 min | None |

**Phase 1 alone fixes what we identified.** Phase 2 makes the nav honest. Phase 3 is the genuinely distinctive product.

---

## 10. Open questions — status

Phase 1 blockers are resolved (2026-05-12). Q4/Q5 deferred to Phase 3 prep.

1. **"Latest security change" on `/account/*` — LOCKED: no dedicated slot.** Cognitively too expensive as permanent chrome. Re-surfaces via a Phase 2 nav badge on the Security item (preferred) or a Phase 3 recents entry. Phase 1 deletes the strip; the signal is not migrated as part of the strip removal.
2. **Footer status block (`"Online · secure session"`) — LOCKED: drop entirely.** Decorative reassurance, not operational truth. Removed in Phase 1 alongside the chrome strip; also fixes the hardcoded-English i18n violation. No replacement, no relocation to L1.
3. **`workbench_id` representation — LOCKED: typed union.** Export `WorkbenchId` (TS union) + `WORKBENCH_IDS` (const tuple with `satisfies readonly WorkbenchId[]`) from `lib/features/rail-memory/constants.ts`. DB columns remain `text` for migration ergonomics; the type layer narrows every reader and writer; adding a workbench requires extending the union (compile-time gate) and the tuple.
4. **Recents instrumentation point — LOCKED (2026-05-12, Phase 3b): RSC-only primitive, not a Server Action.** `recordRecentVisit(input)` lives in `lib/features/rail-memory/data/recent.mutations.server.ts` (server-only). RSC index/detail pages opt in by calling it in `Promise.all` with their other Tier A reads, passing the validated `(organizationId, userId)` from `requireOrgSession` explicitly — never from input. Rationale: a `"use server"` exposure would require accepting `organizationId` over the wire and re-introduce the IDOR vector closed by `AGENTS.md §5`. Rate limiting is **database-side** (single indexed lookup against `rail_recent_item` filtered by `(org, user, workbench, resourceType, resourceId | NULL, occurredAt >= now - 30s)`), not in-memory, because Next.js serverless executions don't share memory across regions. Recents are NOT audited — high frequency would dwarf legitimate IAM events; OTEL counters land in a follow-up.
5. **Pinned-item label staleness — LOCKED (2026-05-12, Phase 3b): denormalized snapshot, no resolver in 3b.** `rail_pinned_item.label` is the operator-supplied snapshot captured at pin time. Phase 3b ships only the snapshot — no resolver registry, no revalidation cron, no `lastVerifiedAt` column. Stale labels are an acceptable trade-off until operator feedback demonstrates the gap. Phase 3c may add a "Refresh pin" affordance per `resourceType` if needed; Phase 3e (per-module ERP roll-out) may add a low-frequency cron + resolver registry once `resourceType` coverage stabilizes. Keeping 3b minimal honors the doctrine of "smallest compliant implementation" (`AGENTS.md §10`).

### Anti-pattern guardrails added during decision (binding for all phases)

These are not open questions — they are constraints the rail must honor:

- **Not a dashboard.** Compressed / sparse / glanceable / vertically rhythmic / execution-adjacent. References: Linear, Notion favorites, Finder sidebar, VSCode explorer, Bloomberg watchlist, Palantir operational rails. Not KPI walls, not widget gardens, not analytics dashboards.
- **Empty slots hide entirely.** No `Views (0)` ghost frames. No "no pinned records yet" decorative blocks. Calm rail = working design, not missing feature.
- **Recents are continuity memory, not audit logs.** Human / compressed / narrative labels (`"Payroll batch · 12m ago"`, `"Vendor ACME · edited yesterday"`, `"Leave approvals · 4 pending"`). The Zod refinement on `workbenchRailRecentSchema.label` rejects strings starting with `erp.` / `iam.` / `org.` / `governance.` / `integration.` / `workflow.` / `system.` (canonical audit-namespace prefixes per `ORG_ADMIN_EVENT_NAMESPACES`). 7W1H audit rows live separately in `iam_audit_event`.
- **Pressure badges carry semantic tone, not raw integers.** `tone: "default" | "attention" | "critical"` is mandatory in Phase 2 builders, derived inside `<module>-rail-pressure.queries.server.ts` via threshold rules (count + age buckets + SLA buckets). Operators read tone first.
- **Temporal feel.** Pending approvals increase, recents decay, tones shift on threshold crossings, pinned stabilize. This is operational gravity, not menu navigation. Phase 3c renderers use `formatDistanceToNow` (or equivalent) for recents; mutations re-render via `revalidatePath` (no stale snapshots).
- **No permanent chrome that earns nothing.** If a slot's content is "Ready" / "Healthy" / "Verified" / "Online · secure session", it does not belong in the rail.

---

## 11. Greenlight checklist

Phase 1 + Phase 2 (org-admin + HRM + platform-admin) shipped 2026-05-12. **Phase 2 complete across every Phase 2-eligible workbench.**

- [x] Slot model approved (sections 4 + 7)
- [x] Open questions §10.1–§10.3 locked; §10.4–§10.5 deferred to Phase 3b
- [x] **Phase 1 — Strip the chrome.** Kernel deletion + `2026-05-12-rail-schema-prune.ts` codemod + four schemas tightened to `.strict()`. Rail-slot builders for account / org-admin / HRM / platform-admin now pure mappers; 27/27 rail DOM tests green; fixtures-parity (9/9) green.
- [x] **Phase 2 — Pressure badges (org-admin reference).** Kernel mutation: `workbenchRailNavBadgeSchema.tone` promoted from optional → required + `.strict()`. New: `lib/features/org-admin/data/org-admin-rail-pressure.shared.ts` (pure threshold derivations) + `org-admin-rail-pressure.queries.server.ts` (`React.cache`, 3 aggregate selects in parallel, structured-log degradation on DB hiccup). Layout fetches pressure in Tier A `Promise.all`; `import-jobs` + `integrations-endpoints` Server Actions revalidate at `"layout"` scope so the rail badge refreshes after mutations. 12/12 pressure unit tests pin every threshold boundary deterministically.
- [x] **Phase 2 — HRM rollout.** Same template, three concerns: pending **leave** decisions (`hrm_approval` × `leave_request`), pending **payroll**-period lock approvals (`hrm_approval` × `payroll_period_lock`), and **compliance** evidence aging / failure (`hrm_compliance_evidence`). New: `lib/features/hrm/data/hrm-rail-pressure.shared.ts` (three pure derivations with SLA-tier thresholds: leave 5d, payroll 3d, compliance 7d) + `hrm-rail-pressure.queries.server.ts` (`React.cache`, four indexed aggregates in parallel). Five action files upgraded to `"layout"` revalidation: `leave-request`, `leave-approval`, `payroll-period`, `payroll-lock-approval`, `compliance`, plus `statutory-submission` + `statutory-acknowledgement`. 12/12 pressure unit tests pin every HRM threshold boundary deterministically.
- [x] **Phase 2 — Platform-admin rollout.** Cross-tenant operator surface, two concerns: currently restricted accounts (`neon_auth.user` active bans) and orphan tenancies (`neon_auth.organization` with no `owner`/`admin` member). New: `lib/features/platform-admin/data/platform-admin-rail-pressure.shared.ts` (two pure derivations: ban-expiry escalation at 24h, orphan-org escalation at 7d) + `platform-admin-rail-pressure.queries.server.ts` (`React.cache`, ban-stats aggregate + `NOT EXISTS` orphan correlated sub-select in parallel, structured-log degradation on DB hiccup). Operator layout fetches pressure in Tier A `Promise.all`; `users.actions.ts` upgraded to `"layout"` revalidation (ban / unban / role mutations refresh the operator rail). 9/9 pressure unit tests pin every threshold boundary deterministically. Combined Phase 2 rail surface **78/78 green**.
- [x] **Phase 3a — Schema + DB.** Migration `0023_rail_working_memory` ships `rail_pinned_item`, `rail_saved_view`, `rail_recent_item` (text PK, FK-less cross-schema convention, indexed `(org, user, workbench, …)` lookups + unique pin-per-resource). Kernel adds four strict Zod schemas (`workbenchRailInboxSchema`, `workbenchRailPinSchema`, `workbenchRailViewSchema`, `workbenchRailRecentSchema`) and extends `workbenchRailSlotsDataSchema` with optional `inbox` / `pinned` / `views` / `recents`. **Kernel-level conditional density** is doctrinal: `inbox.count` must be ≥ 1, slot arrays must be non-empty (`recents` ≤ 5). Empty memory expressed by *omitting* the slot, never by a `count: 0` placeholder or empty array. 15 new parser tests pin positive shape, strict-key rejection, conditional density, and the list-level recent variant without `resourceId`. UI rendering of the new slots is **intentionally out of scope** — `WorkbenchRail` ignores them until 3c.
- [x] **Phase 3a follow-through — audit-namespace label refinement.** `workbenchRailRecentSchema.label` adds a `.refine` rejecting strings that start with canonical audit-namespace prefixes (`iam.` / `org.` / `erp.` / `governance.` / `integration.` / `workflow.` / `system.` — mirrors `ORG_ADMIN_EVENT_NAMESPACES`). Whole-token boundary: `"ergonomics"` and `"organic"` remain valid; `"erp.contact.record.create"` is refused. Constant exported as `WORKBENCH_RAIL_FORBIDDEN_LABEL_NAMESPACES` for the rail-memory module to mirror at the writer boundary. Two parity tests (kernel + writer) pin both layers.
- [x] **Phase 3b — `rail-memory` feature module.** New `lib/features/rail-memory/` under the AGENTS §6 module contract (`actions/`, `data/`, `schemas/`, `constants.ts`, `types.ts`, `index.ts`, `server.ts`, `client.ts`). **6 Server Actions** under `iam.workbench.*` audit (`pinRecordAction`, `unpinRecordAction`, `reorderPinsAction`, `saveViewAction`, `updateViewAction`, `deleteViewAction`), all Tier B with `requireOrgSession` + `after()`-deferred `writeIamAuditEventFromNextHeaders` + `revalidatePath(..., "layout")` for rail freshness. **3 `React.cache`-wrapped queries** (`listPinnedForUser`, `listSavedViewsForUser`, `listRecentsForUser`) + 2 count helpers for cap enforcement. **Pin mutations primitive** (`insertPin`, `findExistingPin`, `deletePin` with `.returning(...)` audit-metadata capture, `reorderPins` as full-permutation Drizzle transaction). **Recent visits** are a server-only RSC primitive (`recordRecentVisit`) — *not* a Server Action — with DB-side rate limiting via indexed `occurredAt >= now - 30s` lookup; rationale recorded in §10 Q4. **IDOR contract**: every id-bearing primitive scopes its WHERE by `(organizationId, userId)` from the validated session; FormData / JSON `organizationId` is never trusted. **`WorkbenchId` typed union** (account / org-admin / hrm / platform-admin) with `WORKBENCH_IDS` const tuple + `isWorkbenchId` predicate + `WORKBENCH_REVALIDATE_PATTERNS` map (each workbench maps to its locale-first revalidate pattern). 53 new unit tests cover constants, six input schemas, mappers, `dedupeRecents`, the audit-namespace label refinement at the writer boundary, and the revalidate-pattern coverage map. **UI wiring is out of scope** — no rail-slot builder reads from `#features/rail-memory` yet (PR 3d).

- [x] **Phase 3c — UI section renderers.** Four conditional section components ship under `components/workbench/left-nav-rail/`: `workbench-rail-inbox.tsx` (single linkable pressure summary, sits **above** the nav, survives collapse with icon-only badge), `workbench-rail-pinned-section.tsx`, `workbench-rail-views-section.tsx`, `workbench-rail-recents-section.tsx` (all three hide entirely in collapsed mode per §3.6). `workbench-rail.tsx` composes them conditionally on `slot !== undefined`; a `data-rail-memory-divider` hairline appears above the views section only when at least one memory section is present. **Locale-aware relative time** for recents via `useNow({ updateInterval: 60_000 })` + `useFormatter().relativeTime(date, now)` from `next-intl` — hydration-safe by construction. **Active state** uses `match: "exact"` on pin / recent rows (no sibling activation); **views never activate** (query-string fragility — matches Linear). Kernel `workbenchRailLabelsSchema` extended with four optional copy keys (`inboxAriaLabel`, `pinnedHeading`, `viewsHeading`, `recentsHeading`) — fallback English literals keep the rail safe from builder regression; per-workbench callers wire localized values in PR 3d. 25 new DOM tests cover: each section visible when data present, absent when slot omitted, hidden when collapsed (except inbox), tone classes, count clamping at "99+", relative-time deterministic output, exact-match active state, view non-activation, bullet-glyph fallback for icon-less recents, composition order (inbox → views → pinned → recents), divider gating, and schema parity for the four new label keys. **UI wiring is still out of scope** — no rail-slot builder shapes inbox / pinned / views / recents yet (PR 3d).

- [x] **Phase 3d-1 — org-admin reference workbench: data + recents wiring.** First half of PR 3d ships **without** new operator affordances so the rail can populate from the existing admin journey. New `lib/features/org-admin/data/org-admin-rail-inbox.shared.ts` adds `deriveOrgAdminInbox` — a pure function that picks the **single** highest-priority pressure entry (`critical > attention > default`, ties broken by count then insertion order) and returns either a kernel-shaped `WorkbenchRailInbox` or `null`. `positive` tones are intentionally never surfaced (the inbox is for "what needs me," not "everything is fine"). `buildOrgAdminRailSlots` extended with optional `inbox` / `pinned` / `views` / `recents` parameters — pure mapper, no DB; empty arrays collapse to `undefined` so the kernel's strict-mode `workbenchRailSlotsDataSchema` never sees `pinned: []`. `app/[locale]/o/[orgSlug]/admin/layout.tsx` now `Promise.all`s **seven** authority/memory reads in one round trip (admin permission, identity, pressure, `listPinnedForUser`, `listSavedViewsForUser`, `listRecentsForUser`, translations), derives the inbox from the existing pressure map, and passes localized labels (`OrgAdmin.rail.inboxAriaLabel | pinnedHeading | viewsHeading | recentsHeading`) to `WorkbenchSubLayout`. New `lib/features/org-admin/data/org-admin-rail-recents.server.ts` exposes `recordOrgAdminPageVisit({orgSession, orgSlug, segment})` — a thin server-only helper that resolves the localized recent label, computes the canonical `org_admin_<segment>` `resourceType`, and defers `recordRecentVisit` via `after()` so the page response streams without waiting on the recents `INSERT`. Wired into all five admin pages (overview / members / audit / integrations / settings) — the audit page records only the bare path (no `?page` query) so paginating the audit log does not fan out into many recents rows. **Inbox label catalog**: `OrgAdmin.rail.inboxLabels.*` carries ICU plural strings per concern (`{count, plural, one {# pending invitation} other {# pending invitations}}`), keyed by `OrgAdminNavKey`. **21 new unit tests** pin every inbox priority boundary (tone severity, count tiebreaker, insertion stability, missing href, blank label, `count: 0` defense, kernel round-trip parse) and every slot-builder behavior (memory pass-through, empty-array collapse, `inbox: null` shorthand, kernel parse, insertion order preservation, pressure→badge regression). **No new operator affordances yet** — pin / save-view buttons + Playwright assertions ship in PR 3d-2. After 3d-1 the rail visibly reacts to admin navigation: visiting `/admin/members` then `/admin/audit` populates the recents section on next render with the correct exact-match active state.

Phase 3d-1 ships the data + recents foundation; Phase 3d-2 adds the **operator-facing affordances** ("Pin this member" on the members list, "Save this filter" on the audit log) plus the Playwright assertions for the IAM audit row chain (`iam.workbench.pin.create`, `iam.workbench.view.create`).
