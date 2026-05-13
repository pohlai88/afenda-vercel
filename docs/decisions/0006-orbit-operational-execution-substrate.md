# ADR-0006 — Orbit: operational execution substrate doctrine

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-11 |
| **Amended** | 2026-05-12 — OneThing / iThink are now **fully retired**. The legacy surfaces, modules, routes, schema tables, Workflow DevKit entrypoints, ingestion adapters, simulation provenance, and product vocabulary have been severed. Orbit is the **only** operational execution surface in the active product and runtime. Legacy `erp.onething.*` / `erp.ithink.*` rows in `iam_audit_event` remain renderable for historical reading; no runtime code generates new ones. Subordinate doctrines split out into ADR-0007a–ADR-0007d. |
| **Supersedes** | OneThing and iThink as planner/execution surfaces, vocabulary, lifecycle doctrine, and future investment target. The prior ADR-0002 entry and all historical OneThing/iThink ADRs have been removed from the active decisions ledger. |
| **Retired surfaces** | `lib/features/onething/**`, `lib/features/ithink/**`, all OneThing/iThink dashboard/account routes, `onething*` Drizzle tables, `onething`-specific recurrence/reminder execution entries, the `onething-digest` cron, the `onething` knowledge source kind, the `onething_import` org-admin ingestion adapter, and OneThing/iThink product language in AGENTS, rules, and message catalogs. Mined doctrine is captured in [`docs/_draft/ithink_draft_v1_deprecated.md`](../_draft/ithink_draft_v1_deprecated.md). |
| **Does not supersede** | **ADR-0001** Spatial OS shell architecture, **ADR-0003** post-login loading bay/Nexus routing, or **ADR-0005** Workbench canonical shell naming. Orbit renders inside Workbench; it does not redefine Workbench/Nexus shell doctrine. |
| **Implements in code** | `lib/features/planner/**`, Orbit routes, planner Drizzle tables, planner server APIs, Orbit UI surfaces, planner directory rules, AGENTS updates, and i18n updates. **No migration adapter from OneThing/iThink is planned** — legacy data is archived once outside the repo (see `docs/_draft/ithink_draft_v1_deprecated.md`) and the destructive drop ships in the same change as schema retirement. |
| **Subordinate doctrines** | [ADR-0007a — Orbit signal and ranking doctrine](0007a-orbit-signal-and-ranking-doctrine.md) · [ADR-0007b — Orbit lifecycle and verification doctrine](0007b-orbit-lifecycle-and-verification-doctrine.md) · [ADR-0007c — Orbit ERP attachment doctrine](0007c-orbit-erp-attachment-doctrine.md) · [ADR-0007d — Orbit temporal coordination doctrine](0007d-orbit-temporal-coordination-doctrine.md) |
| **Related rules** | [`.cursor/rules/planner-directory.mdc`](../../.cursor/rules/planner-directory.mdc) · [`.cursor/rules/shell-directory.mdc`](../../.cursor/rules/shell-directory.mdc) · [`.cursor/rules/erp-primitives.mdc`](../../.cursor/rules/erp-primitives.mdc) |

---

## 1. Context

Afenda has outgrown the idea of a task-list surface. OneThing and iThink improved consequence handling and interaction quality, but they mixed multiple concerns into one operational surface:

- consequence resolution
- task/document interaction
- audit continuity
- temporal coordination
- recurrence/reminder execution
- Lynx grounding

That coupling makes the model hard to scale across ERP modules. It also encourages feature gravity toward generic productivity patterns rather than ERP-native execution.

Afenda needs a higher-order substrate that answers a broader question:

```txt
What deserves operational attention now, and what action must follow?
```

Orbit is that substrate.

---

## 2. Decision

Afenda defines **Orbit** as its **operational execution substrate**.

Orbit is not:

- a todo module
- a project-management clone
- a generic productivity surface
- a board-first planning tool

Orbit is:

- ERP attention infrastructure
- operational pressure coordination
- execution routing
- business-truth-linked human work orchestration

Public product name:

```txt
Orbit
```

Internal domain name:

```txt
Planner
```

Core primitives:

- `PlannerSignal` — detected operational pressure
- `PlannerItem` — executable work object

These two primitives must remain separate.

---

## 3. Core doctrinal rules

### 3.1 Public and internal naming

Public UX uses Orbit language. Internal code retains Planner terminology.

| Public | Internal |
| ----- | ----- |
| Orbit | Planner |
| Orbit item | `PlannerItem` |
| Orbit signal | `PlannerSignal` |
| Orbit session | `PlannerSession` |
| Orbit timeline | `PlannerSchedule` / timeline views |

### 3.2 Signal and item separation

`PlannerSignal` and `PlannerItem` represent different things and must not be collapsed into one record type.

- A signal may expire, correlate, escalate, suppress, or auto-resolve without creating work.
- One signal may produce many items.
- Many signals may merge into one item.
- Items are durable execution records, not raw pressure events.

### 3.3 Product posture

Orbit is:

- queue-first
- timeline-first
- signal-first
- execution-first
- keyboard-first

Orbit is not:

- kanban-first
- card-first
- board-identity software

Boards, roadmaps, gantt, and similar views may exist later as secondary views only.

### 3.4 Existing shared primitives stay canonical

Orbit must consume existing Afenda shared substrates rather than duplicate them:

- temporal spine: `#lib/erp/temporal-spine.shared`
- audit grammar: `#lib/erp/audit-7w1h.shared` and `#lib/erp/audit-7w1h.server`
- CRUD-SAP audit builder: `#lib/erp/crud-sap.shared`
- Workbench shell architecture: ADR-0001 and ADR-0005

Orbit does not redefine shell, auth, tenant authority, or route doctrine.

---

## 4. Architectural layers

Orbit is composed of seven layers.

### 4.1 Operational Object Layer

Durable execution entities:

- `PlannerItem`
- `PlannerRelation`
- `PlannerAssignment`
- `PlannerSchedule`
- `PlannerSession`
- `PlannerActivity`
- `PlannerReminder`
- `PlannerRecurrence`
- `PlannerLink`
- `PlannerView`

### 4.2 Signal Layer

Operational pressure intake:

- ERP events
- anomalies
- deadlines
- workflow transitions
- imports
- audit triggers
- automations
- human captures
- AI recommendations

### 4.3 Planning Layer

Execution organization:

- queue
- today
- timeline
- schedule
- recurrence
- reminders
- snooze
- workload planning
- saved views

### 4.4 ERP Attachment Layer

Orbit's moat is ERP causality linkage.

Signals and items can attach to ERP truth using a generic reference shape:

- module
- entity type
- entity id
- display label
- href
- causality reason
- temporal context
- audit context

### 4.5 Temporal Layer

Orbit scheduling, reminder, recurrence, escalation-window, and session logic consume Afenda's Past · Now · Next temporal spine instead of creating a parallel time model.

### 4.6 Pressure and Ranking Layer

Signals and items are ranked by operational pressure, not a simplistic priority label.

### 4.7 Execution Intelligence Layer

Future AI and analytics layer for:

- blocked work detection
- delay analysis
- pressure heatmaps
- recurring failures
- cross-module bottlenecks
- recommendation generation

---

## 5. Signal doctrine

`PlannerSignal` is the unit of detected operational pressure.

Initial signal classes:

- `anomaly`
- `deadline`
- `escalation`
- `dependency`
- `verification`
- `review`
- `alert`
- `recommendation`
- `prediction`
- `manual_capture`

Initial signal lifecycle:

- `detected`
- `correlated`
- `promoted`
- `deferred`
- `suppressed`
- `expired`
- `auto_resolved`
- `dismissed`

Signals may become items, enrich existing items, or disappear without item creation.

---

## 6. Execution item doctrine

`PlannerItem` is the unit of executable operational work.

Initial lifecycle:

- `triaged`
- `assigned`
- `scheduled`
- `active`
- `blocked`
- `awaiting_external`
- `ready_for_review`
- `verified`
- `resolved`
- `deprecated`
- `cancelled`

Rules:

- human-created items begin at `triaged`
- signal-promoted items begin at `triaged`
- `resolved` normally requires either `verified` or an explicit resolution rationale
- `deprecated` means superseded or no longer operationally valid
- `cancelled` means intentionally stopped before completion

Orbit must never regress to `todo / doing / done` as its canonical lifecycle.

---

## 7. Ownership doctrine

Orbit requires explicit accountability semantics.

Initial ownership roles:

- `owner` — accountable entity
- `assignee` — current executor
- `reviewer` — verification authority
- `watcher` — passive observer
- `escalation_owner` — governance responsibility
- `originating_system` — source ERP module/workflow/import/audit/automation
- `automation_actor` — system-generated actor

Ownership is a first-class domain concern, not metadata decoration.

---

## 8. Pressure doctrine

Orbit must model operational pressure using multiple dimensions.

Initial dimensions:

- `urgency`
- `impact`
- `severity`
- `confidence`
- `effort`
- `escalation_level`
- `temporal_proximity`
- `ownership_pressure`

A derived display priority may exist, but the dimensions above remain canonical.

Reserve future concept:

```txt
PlannerPressure
```

This represents aggregated pressure across signals, items, ownership, timelines, and escalation paths.

---

## 9. ERP attachment doctrine

Orbit's core strategic value is cross-ERP execution causality.

Initial source/attachment targets:

- HRM employee, contract, payroll, leave, attendance
- contacts and counterparties
- sales opportunities, orders, invoices, escalations
- purchase requests, vendors, supplier documents
- inventory variance, stock movement, replenishment
- knowledge sources, ingestion runs, document reviews
- org admin audit events, member actions, policy changes
- execution workflow runs and operational jobs

Representative flows:

- Vendor certificate expiring -> `PlannerSignal(deadline)` -> remediation `PlannerItem`
- Payroll discrepancy detected -> `PlannerSignal(anomaly)` -> investigation item
- Inventory variance detected -> `PlannerSignal(anomaly)` -> audit/reconciliation item
- Customer escalation created -> `PlannerSignal(escalation)` -> response item
- HR contract renewal approaching -> `PlannerSignal(deadline)` -> review item

ERP modules create signals/items through planner server APIs only. Orbit UI internals are never imported by ERP modules.

---

## 10. UX doctrine

Orbit should feel:

- calm
- precise
- mechanical
- systemic
- editorial
- operational

Reference posture:

- Apple Reminders clarity
- Linear precision
- Notion Calendar temporal awareness
- Palantir operational intelligence
- Bloomberg-style live execution density

Orbit should not look or behave like:

- ClickUp
- Monday
- Asana
- Trello
- generic PM SaaS

Recommended primary surfaces:

- `Orbit Queue`
- `Orbit Today`
- `Orbit Timeline`
- `Orbit Signals`
- `Orbit Sessions`
- `Orbit Links`
- `Orbit Intelligence` later

Prefer "queue" over "inbox" as the dominant execution metaphor.

---

## 11. Repository and module consequences

Orbit implementation lands under:

```txt
lib/features/planner/
```

Reserved architectural categories:

```txt
domain/
server/
client/
scheduling/
recurrence/
worklog/
filters/
views/
integrations/
audit/
relations/
commands/
policies/
automation/
signals/
ranking/
timeline/
pressure/
intelligence/
```

This is an intentional exception to the generic feature-module ceiling described in `AGENTS.md`. The exception is governed by this ADR and `.cursor/rules/planner-directory.mdc`.

Public barrels:

- `#features/planner`
- `#features/planner/server`
- `#features/planner/client`

Planned routes:

- `/{locale}/o/{orgSlug}/dashboard/orbit`
- `/{locale}/account/orbit`

Orbit and legacy surfaces run side-by-side until parity and migration are proven.

---

## 12. Legacy surface policy

OneThing and iThink are **fully retired** as of the 2026-05-12 amendment.

They are:

- removed from `lib/features/`
- removed from the App Router (`app/[locale]/o/[orgSlug]/dashboard/{onething,ithink}/**` and `app/[locale]/(iam)/account/onething/**`)
- removed from `lib/db/schema.ts` (the destructive drop is the next Drizzle migration after `0018_orbit_planner_substrate`)
- removed from Workflow DevKit execution entrypoints (no `enqueueOneThing*` exports remain)
- removed from cron (`/api/cron/onething-digest` is gone)
- removed from ingestion adapters (`onething_import`) and knowledge source kinds (`onething`)
- removed from simulation graphs and replay metadata

They are not:

- supported as a runtime
- a vocabulary source for new planning work
- the architectural base for Orbit
- a migration source (the original plan envisioned migration adapters; that path is rejected — see [§13](#13-non-goals) and [`docs/_draft/ithink_draft_v1_deprecated.md`](../_draft/ithink_draft_v1_deprecated.md))

The only remaining traces of OneThing / iThink in the repository are:

- historical Drizzle migration SQL and meta snapshots (DB continuity)
- legacy `erp.onething.*` / `erp.ithink.*` strings in `iam_audit_event` and a small Edge/Node-safe `historical-erp-execution-audit-actions.shared.ts` constant module that lets the audit renderer interpret them
- [`docs/_draft/ithink_draft_v1_deprecated.md`](../_draft/ithink_draft_v1_deprecated.md) (sole committed narrative archive)

Do not reintroduce OneThing / iThink runtime, vocabulary, or routes.

---

## 13. Non-goals

This ADR does not:

- preserve OneThing / iThink as supported legacy or migration sources (per the 2026-05-12 amendment, they are fully retired)
- require data migration into Orbit (legacy data is archived once outside the repo and dropped)
- redefine Workbench, Nexus, or auth shell doctrine
- authorize generic productivity feature creep
- make board/kanban/roadmap views the primary Orbit identity

---

## 14. Conformance criteria

A change conforms to ADR-0006 when it satisfies all of the following:

1. New forward execution/planning work uses Orbit vocabulary and planner boundaries.
2. `PlannerSignal` and `PlannerItem` remain separate abstractions.
3. Orbit logic consumes Afenda temporal spine and audit primitives rather than cloning them.
4. Queue/timeline/signal identity remains primary over boards/cards.
5. ERP modules integrate through planner server APIs, not Orbit UI internals.
6. OneThing/iThink are treated as **retired** — no runtime code may reintroduce their modules, routes, schema, workflows, or vocabulary.
7. Any future `lib/features/planner/` module structure follows `.cursor/rules/planner-directory.mdc` and matching AGENTS/script contract updates.

---

## 15. Implementation boundary

Rollout to date (2026-05-12):

1. ADR-0006 published with retirement amendment.
2. Planner/Orbit governance files in place; ADR-0007a–ADR-0007d ratified.
3. Orbit tables, APIs, and routes shipped (`drizzle/0018_orbit_planner_substrate`).
4. OneThing / iThink runtime, schema, workflows, and routes severed in the same change as this amendment.
5. No migration adapters built; legacy data is archived once outside the repo and dropped.

Orbit is therefore the only operational execution substrate in the active product and runtime. Future changes must not reintroduce legacy execution surfaces.
