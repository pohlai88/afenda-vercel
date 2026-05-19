# Orbit — operational execution substrate

> **Public product name:** Orbit · **Module door (Layer 2):** `lib/features/orbit/` · **Public import:** `#features/orbit`
>
> Sealed under [ADR-0006 §3.1](../../../docs/decisions/0006-orbit-operational-execution-substrate.md). The directory + import-surface rename from `lib/features/planner/` to `lib/features/orbit/` was executed under [ADR-0040 Phase 1](../../../docs/decisions/0040-orbit-planner-priority-2-closure.md). Internal TypeScript symbols (`PlannerSignal`, `PlannerItem`, …) and database tables (`planner_*`) **remain wire-stable** — see ADR-0040 §2 for the deferred Phase-2 / Phase-3 scope.

---

## Wire-format asymmetry (intentional, not drift)

| Surface | Phase-1 state | Owner / contract |
| --- | --- | --- |
| Module directory on disk | `lib/features/orbit/` | ADR-0040 Phase 1 |
| Public import alias | `#features/orbit` | ADR-0040 Phase 1 |
| Cursor rule | `.cursor/rules/orbit-directory.mdc` | ADR-0040 Phase 1 |
| Internal file basenames | `planner-*.shared.ts` (e.g. `planner-orbit-path.shared.ts`) | Phase-2 cleanup target |
| Internal TS symbols | `PlannerSignal`, `PlannerItem`, `PLANNER_AUDIT_ACTIONS`, … | Phase-2 cleanup target |
| Drizzle table names | `planner_signal`, `planner_item`, … (`pgTable("planner_*")`) | **Ledger-stable; never renamed** (PRIORITY #1, ADR-0032) |
| Audit string namespace | `erp.planner.*` (e.g. `erp.planner.signal.create`) | Phase-3 deferred — coordinated cutover with downstream observers |
| Workflow entrypoint exports | `enqueuePlannerRecurrenceWorkflowRun`, `enqueuePlannerReminderWorkflowRun` | **Wire-stable; never renamed** (WDK durable run identity) |
| URL surfaces | `/{locale}/o/{orgSlug}/apps/orbit/*` | Already `orbit/` since the App Router shell migration |
| i18n namespace | `messages/*.json#Dashboard.Orbit` | Already `Orbit` |

Anyone touching this module: read [ADR-0040 §2](../../../docs/decisions/0040-orbit-planner-priority-2-closure.md) before proposing a rename of any row whose Phase-1 state still says `planner`. Wire-format renames are not Phase-1 work.

---

## Definition

**Orbit is Afenda's operational execution substrate. It coordinates ERP attention, operational pressure, human execution, scheduling, recurrence, reminders, work sessions, and ERP-linked causality across all modules. The `lib/features/orbit/` module owns the domain primitives (`PlannerSignal`, `PlannerItem`, …) and surface logic that render as Orbit to operators.**

Orbit is **not** a generic todo module, project-management clone, board-first planner, or productivity SaaS surface. It is ERP attention infrastructure with a typed signal/item separation and a multi-dimensional pressure model.

---

## Orbit Includes

| Area | What It Covers |
| --- | --- |
| **Operational object model** | `PlannerItem` (executable work), `PlannerSignal` (detected pressure), `PlannerRelation` (item↔item / item↔signal links), `PlannerLink` (ERP attachment), `PlannerView` (saved view) |
| **Signal intake** | `anomaly`, `deadline`, `escalation`, `dependency`, `verification`, `review`, `alert`, `recommendation`, `prediction`, `manual_capture` |
| **Signal lifecycle** | `detected → correlated → promoted → deferred → suppressed → expired → auto_resolved → dismissed` |
| **Item lifecycle** | `triaged → assigned → scheduled → active → blocked → awaiting_external → ready_for_review → verified → resolved → deprecated → cancelled` |
| **Ownership roles** | `owner`, `assignee`, `reviewer`, `watcher`, `escalation_owner`, `originating_system`, `automation_actor` |
| **Pressure dimensions** | `urgency`, `impact`, `severity`, `confidence`, `effort`, `escalation_level`, `temporal_proximity`, `ownership_pressure` (multi-dimensional; `displayPriority` is derived) |
| **Verification** | First-class lifecycle states (`ready_for_review`, `verified`); reviewer ownership distinct from assignee unless policy permits self-verification; resolution rationale required when `verified` is bypassed |
| **ERP attachment** | Typed reference (`module`, `entityType`, `entityId`, `displayLabel`, `href`, `causalityReason`, `temporalContext`, `auditContext`); ERP modules attach via planner server APIs only |
| **Temporal coordination** | Consumes the shared `Past · Now · Next` spine (`#lib/erp/temporal-spine.shared`); `PlannerSchedule`, `PlannerRecurrence`, `PlannerReminder` are first-class entities (not row columns) |
| **Sessions** | `PlannerSession` records operational continuity (start/stop), contributes to ranker context, emits `erp.planner.session.*` audit events |
| **Durable execution** | Recurrence and reminder runs ship through `lib/features/execution/` and Workflow DevKit (`enqueuePlannerRecurrenceWorkflowRun`, `enqueuePlannerReminderWorkflowRun`) |
| **Audit grammar** | `erp.planner.<object>.<verb>` (built via `#lib/erp/crud-sap.shared`); 7W1H sentences via `#lib/erp/audit-7w1h.shared`; legacy `erp.onething.*` / `erp.ithink.*` strings remain renderable but no runtime emits them |
| **Public surfaces** | Orbit Queue, Orbit Triage, Orbit Today, Orbit Timeline, Orbit Signals, Orbit Sessions, Orbit Links |
| **Cross-module integration** | HRM, Lynx, Knowledge, Nexus, Org-Admin, Execution import via `#features/orbit` and `#features/orbit/server` only |
| **i18n** | `messages/*.json#Dashboard.Orbit` namespace; ask-docs at `content/ask-docs/orbit/` |

---

## Orbit Does Not Include

| Excluded Area | Owned By |
| --- | --- |
| Cross-tenant references | Tenancy is enforced via `organizationId`; cross-tenant flows are explicitly out of scope |
| Generic "tag" / "label" field used in place of typed ERP attachment | ERP Attachment doctrine (ADR-0007c §2) |
| `p1 / p2 / p3 / p4` priority picker as primary capture input | Pressure is computed from multi-dimensional inputs (ADR-0007a §3) |
| `todo / doing / done` lifecycle | Executable lifecycle (ADR-0007b §2) |
| "Mark as done" button that bypasses verification | Verification doctrine (ADR-0007b §3) |
| Generic "due date" picker as the only temporal input | Temporal coordination (ADR-0007d §3) |
| Bespoke crons in `vercel.json` | Durable execution via `lib/features/execution/` (ADR-0007d §4) |
| Workbench shell, Nexus shell, auth shell | ADR-0001 (Spatial OS shell) · ADR-0005 (Workbench shell) · ADR-0003 (Post-login bootstrap) |
| Tenant authorization | `requireOrgSession` from `#lib/auth`; ERP RBAC from `#features/erp-rbac/server` |
| Temporal spine itself | `#lib/erp/temporal-spine.shared` (planner consumes; never redefines) |
| Audit ledger | `iam_audit_event` rows written via `#lib/erp/audit-7w1h.server` |
| Workflow DevKit core contract | `lib/features/execution/` |
| Knowledge embeddings / pgvector | `lib/features/knowledge/` (Lynx grounding consumes Orbit context, not the reverse) |
| OneThing / iThink runtime | Retired (ADR-0006 amendment 2026-05-12); historical strings only renderable via `lib/erp/historical-erp-execution-audit-actions.shared.ts` |

---

## Orbit Requirement Statement

| Requirement | Description |
| --- | --- |
| **Orbit** | Coordinates detected operational pressure (`PlannerSignal`) and executable work (`PlannerItem`) with explicit ownership, multi-dimensional pressure ranking, first-class verification, typed ERP attachment, scheduling/recurrence/reminders, work sessions, durable execution via Workflow DevKit, and ERP-linked causality — emitting `erp.planner.*` audit events through the shared 7W1H grammar. |

---

## Doctrinal Requirements (from ADR-0006 + ADR-0007a–d)

| Code | Requirement |
| --- | --- |
| **ORB-001** | System shall expose **Orbit** as the public product name and the module door `lib/features/orbit/` (`#features/orbit`) as the canonical Layer-2 surface; internal `Planner*` TypeScript symbols, `planner_*` DB tables, and `erp.planner.*` audit strings remain wire-stable under ADR-0040 Phase 1 until coordinated cutover (ADR-0006 §3.1, ADR-0040 §2). |
| **ORB-002** | System shall represent detected operational pressure as `PlannerSignal` and executable work as `PlannerItem`; the two primitives shall not be collapsed into a single record (ADR-0006 §3.2, ADR-0007a §2). |
| **ORB-003** | System shall classify signals using one of: `anomaly`, `deadline`, `escalation`, `dependency`, `verification`, `review`, `alert`, `recommendation`, `prediction`, `manual_capture` (ADR-0007a §2.1). |
| **ORB-004** | System shall transition signals through the canonical lifecycle: `detected → correlated → promoted → deferred → suppressed → expired → auto_resolved → dismissed` (ADR-0007a §2.2). |
| **ORB-005** | System shall allow signals to expire, correlate, escalate, suppress, or auto-resolve without producing a `PlannerItem` (ADR-0006 §3.2, ADR-0007a §2.3). |
| **ORB-006** | System shall transition items through the canonical lifecycle: `triaged → assigned → scheduled → active → blocked → awaiting_external → ready_for_review → verified → resolved → deprecated → cancelled` (ADR-0007b §2). |
| **ORB-007** | System shall record an explicit `assignee` ownership role before transitioning an item to `assigned`, and a `PlannerSchedule` before transitioning to `scheduled` (ADR-0007b §2). |
| **ORB-008** | System shall require a recorded blocker (signal, dependency, or activity-log rationale) before transitioning an item to `blocked` (ADR-0007b §2). |
| **ORB-009** | System shall require a `reviewer` ownership role distinct from the `assignee` to transition an item to `verified`, unless policy explicitly allows self-verification (ADR-0007b §3.2). |
| **ORB-010** | System shall require either a `verified` predecessor state or an explicit resolution rationale on the activity log to transition an item to `resolved` (ADR-0006 §6, ADR-0007b §3.4). |
| **ORB-011** | System shall **not** regress to `todo / doing / done` as the canonical lifecycle (ADR-0006 §6, ADR-0007b §2). |
| **ORB-012** | System shall rank signals and items using multi-dimensional pressure inputs (`urgency`, `impact`, `severity`, `confidence`, `effort`, `escalation_level`, `temporal_proximity`, `ownership_pressure`); `displayPriority` shall be derived, never stored as primary truth (ADR-0006 §8, ADR-0007a §3). |
| **ORB-013** | System shall **not** present a `p1 / p2 / p3 / p4` priority picker as the primary capture input or a single ordinal severity badge as a row's only pressure indicator (ADR-0007a §3.4). |
| **ORB-014** | System shall record ownership across `owner`, `assignee`, `reviewer`, `watcher`, `escalation_owner`, `originating_system`, `automation_actor` roles as first-class domain data, not metadata decoration (ADR-0006 §7). |
| **ORB-015** | System shall attach signals and items to ERP truth using a typed reference shape (`module`, `entityType`, `entityId`, `displayLabel`, `href`, `causalityReason`, `temporalContext`, `auditContext`); blank `causalityReason` is not acceptable (ADR-0006 §9, ADR-0007c §2, §3.3). |
| **ORB-016** | System shall route ERP integrations through `#features/orbit/server` only; ERP modules shall not import orbit UI or client internals (ADR-0006 §11, ADR-0007c §3.1). |
| **ORB-017** | System shall **not** deep-import ERP module internals from orbit; orbit consumes `#features/<module>` and `#features/<module>/server` only (ADR-0007c §3.2). |
| **ORB-018** | System shall consume the shared `Past · Now · Next` temporal spine (`#lib/erp/temporal-spine.shared`) for narrative, ranker, Lynx grounding, timeline projection, and recurrence/reminder logic; orbit shall not redefine a parallel temporal model (ADR-0006 §4.5, ADR-0007d §2). |
| **ORB-019** | System shall represent scheduling, recurrence, and reminders as first-class entities (`PlannerSchedule`, `PlannerRecurrence`, `PlannerReminder`) — not as row columns or JSONB blobs (ADR-0007d §3). |
| **ORB-020** | System shall ship recurrence and reminder runs through `lib/features/execution/` and Workflow DevKit via `enqueuePlannerRecurrenceWorkflowRun` and `enqueuePlannerReminderWorkflowRun`; no Orbit-specific cron entries (ADR-0007d §4, §6). |
| **ORB-021** | System shall record run lifecycle audit using `erp.execution.planner_recurrence.*` and `erp.execution.planner_reminder.*` action strings; legacy `erp.execution.onething_*` strings remain renderable but no runtime code emits them (ADR-0007d §4). |
| **ORB-022** | System shall record `PlannerSession` rows for operational continuity (start/stop via Server Actions), bound to a single item, contributing to ranker context, emitting `erp.planner.session.*` audit events (ADR-0007d §5). |
| **ORB-023** | System shall emit audit events using `erp.planner.<object>.<verb>` action strings built via `#lib/erp/crud-sap.shared`; rows include `actorSessionId`, `organizationId`, `resourceType`, `resourceId`, and minimal `metadata` (no secrets, no bulk PII) (ADR-0006 §3.4, ADR-0007b §4). |
| **ORB-024** | System shall expose Orbit through queue-first, timeline-first, signal-first, execution-first, keyboard-first surfaces; board / kanban / roadmap views are secondary and shall not bypass pressure ranking by default (ADR-0006 §3.3, §10, ADR-0007a §3.3). |
| **ORB-025** | System shall isolate orbit runtime such that ERP modules and Orbit UI never share private internals; the public composition entry is `#features/orbit`, server-only entry is `#features/orbit/server`, client islands entry is `#features/orbit/client` (ADR-0006 §11, ADR-0007c §3, ADR-0030). |
| **ORB-026** | System shall **not** reintroduce OneThing or iThink runtime, vocabulary, schema, routes, workflows, cron, ingestion adapters, or knowledge source kinds (ADR-0006 §12, §13). |

---

## Orbit Acceptance Criteria

| No. | Acceptance Criteria |
| ---: | --- |
| 1 | A signal can be created, correlated, promoted, deferred, suppressed, expired, auto-resolved, or dismissed without producing a `PlannerItem`. |
| 2 | A signal that promotes to an item leaves the item starting in `triaged` and records the source signal id. |
| 3 | An item cannot reach `assigned` without an `assignee` ownership row. |
| 4 | An item cannot reach `scheduled` without a corresponding `PlannerSchedule`. |
| 5 | An item cannot reach `blocked` without a recorded blocker (signal id, dependency, or activity-log rationale). |
| 6 | An item cannot reach `verified` unless a `reviewer` ownership row exists distinct from the `assignee`, or policy explicitly permits self-verification. |
| 7 | An item cannot reach `resolved` unless it has been `verified` or carries an explicit resolution rationale on the activity log. |
| 8 | The capture surface does not present a `p1 / p2 / p3 / p4` priority picker as the primary input. |
| 9 | List rows do not display a single ordinal severity badge as the only pressure indicator. |
| 10 | The ranker consumes pressure dimensions, temporal context, ownership context, and ERP attachment metadata; `displayPriority` is derived, never stored as the primary truth. |
| 11 | Every ERP attachment records a non-empty `causalityReason`. |
| 12 | ERP modules create signals/items via `#features/orbit/server` only — they never import orbit UI or client internals. |
| 13 | Orbit does not deep-import any ERP module internals (`#features/<module>/data/*`). |
| 14 | Recurrence and reminder runs are enqueued through `lib/features/execution/` and emit `erp.execution.planner_*` audit events. |
| 15 | Sessions start and stop through Server Actions in `commands/{start,stop}-planner-session.ts` and emit `erp.planner.session.*` audit events. |
| 16 | Audit rows are written only after successful DB commit, include `actorSessionId` + `organizationId` + `resourceType` + `resourceId`, and never embed secrets or bulk PII. |
| 17 | The Orbit URL tree is `/{locale}/o/{orgSlug}/apps/orbit{/queue,/triage,/today,/timeline,/signals,/sessions,/links}`; the module door is `lib/features/orbit/`. |
| 18 | i18n copy uses the `Dashboard.Orbit.*` namespace; ask-docs lives under `content/ask-docs/orbit/`. |
| 19 | Cross-module Orbit consumers (HRM, Lynx, Knowledge, Nexus, Org-Admin, Execution) import only via `#features/orbit` and `#features/orbit/server` public doors. |
| 20 | No runtime code emits `erp.onething.*` or `erp.ithink.*` action strings; historical rows render correctly via the shared 7W1H sentence builder. |

---

## Module layout

```txt
lib/features/orbit/
├── ARCHITECTURE.md                       ← this file
├── README.md                             ← orientation snippet (see ADR-0006 §11)
├── index.ts                              ← #features/orbit public door (server-safe)
├── server.ts                             ← #features/orbit/server (queries + mutations)
├── client.ts                             ← #features/orbit/client (Server Actions, schemas, pure helpers)
├── types.ts
├── constants.ts                          ← lifecycles, ownership roles, sort modes, organizationOrbitPath
├── planner.contract.ts                   ← PLANNER_AUDIT_ACTIONS + buildPlannerAuditAction (Phase-2 cleanup target)
├── planner-orbit-path.shared.ts          ← ORBIT_SURFACES + segment guards (Phase-2 cleanup target)
├── orbit-surface-metadata.shared.ts      ← surface metadata for layout
│
├── domain/                               ← cross-cutting domain helpers (orbit-keyboard-nav, planner.schemas)
├── data/                                 ← server-only queries / mutations / list-surface builders
├── views/                                ← orbit-* surface RSC + client islands (page, capture, batch, hotkeys)
├── components/                           ← orbit-* shared composition (apps-route-page, command-layer, governed-table)
├── commands/                             ← Server Actions: capture, transition, schedule, link, relation, session, comment, reminder, recurrence, view
├── data/orbit-*-list-surface.server.ts   ← Pattern C / B governed-renderer surface builders
│
├── signals/                              ← PlannerSignal class taxonomy
├── ranking/                              ← multi-dimensional ranker + derived pressure
├── pressure/                             ← canonical pressure dimensions
├── policies/                             ← escalation policy, notification policy, scope helpers
├── triage/                               ← triage rule evaluation
├── evidence/                             ← evidence graph builders for UI grouping
├── filters/                              ← view filter / sort schemas
├── relations/                            ← PlannerRelation shapes
├── integrations/                         ← PlannerLink shape + ERP producer signal helper
├── scheduling/                           ← PlannerSchedule shape
├── recurrence/                           ← PlannerRecurrence shape
├── timeline/                             ← timeline projection helpers
├── worklog/                              ← PlannerSession shape + duration helpers
├── automation/                           ← Workflow DevKit workflows + run-payload schemas
├── audit/                                ← activity display helpers + audit shape
└── intelligence/                         ← (placeholder) future AI/analytics layer per ADR-0006 §4.7
```

This is the **extended vocabulary exception** approved by [ADR-0006 §11](../../../docs/decisions/0006-orbit-operational-execution-substrate.md). Adding a new top-level category requires updating ADR-0006 (or filing a new ADR), `.cursor/rules/orbit-directory.mdc`, and the orbit allowlist in `scripts/check-agent-contract.mjs` in the same change.

---

## Public doors

| Layer | Door | Importable from |
| --- | --- | --- |
| Server (RSC, Server Actions, layouts) | `#features/orbit` | Anywhere server-safe; pulls server-only graph when evaluated |
| Server-only data | `#features/orbit/server` | RSC pages, layouts, `*.server.ts` files |
| Client islands | `#features/orbit/client` | `*.client.tsx`, `"use client"` modules |
| Client-safe path helper | `#features/orbit/planner-orbit-path.shared` | Cycle-avoidance exception — see `scripts/check-agent-contract.mjs` |

**ERP modules integrate through `#features/orbit/server` only.** Orbit UI internals (`views/`, `components/`, `client.ts`) are never imported by ERP modules.

---

## Audit grammar

```ts
erp.planner.<object>.<verb>            // primary orbit audit grammar (wire-stable)
erp.execution.planner_<object>.<verb>  // durable execution run lifecycle (wire-stable)
erp.planner.session.{start,stop}       // operational continuity (wire-stable)
```

Canonical literals live in [`planner.contract.ts`](./planner.contract.ts) (orbit) and [`lib/features/execution/execution.contract.ts`](../execution/execution.contract.ts) (durable runs). Every emitted string must round-trip through the typed registry — never string-literal an audit action at the call site. The `planner` substring inside these strings is **wire-stable**: per ADR-0040 §2, audit-string cutover (Phase 3) is deferred until coordinated with downstream observers.

Legacy `erp.onething.*` and `erp.ithink.*` strings are read-only renderable via [`lib/erp/historical-erp-execution-audit-actions.shared.ts`](../../erp/historical-erp-execution-audit-actions.shared.ts). No runtime code may emit them (ADR-0006 §12).

---

## Anti-task-manager posture (block merge if violated)

Per [ADR-0006 §10](../../../docs/decisions/0006-orbit-operational-execution-substrate.md), [ADR-0007a §3.4](../../../docs/decisions/0007a-orbit-signal-and-ranking-doctrine.md), [ADR-0007b §5](../../../docs/decisions/0007b-orbit-lifecycle-and-verification-doctrine.md), [ADR-0007c §5](../../../docs/decisions/0007c-orbit-erp-attachment-doctrine.md), [ADR-0007d §6](../../../docs/decisions/0007d-orbit-temporal-coordination-doctrine.md):

```txt
✗ p1/p2/p3/p4 priority picker as primary capture input
✗ single ordinal severity badge as a row's only pressure indicator
✗ "mark as done" button bypassing verification when policy requires it
✗ todo/doing/done lifecycle on PlannerItem
✗ generic "tag" / "label" field replacing typed ERP attachment
✗ generic "due date" picker as the only temporal input
✗ "remind me" toggle hiding the underlying PlannerReminder contract
✗ board / kanban / roadmap surface presented as the Orbit identity
✗ orbit-specific cron entries in vercel.json
✗ free-form description hiding causality (causalityReason must be structured)
```

---

## References

| Source | Role |
| --- | --- |
| [ADR-0006 — Orbit operational execution substrate](../../../docs/decisions/0006-orbit-operational-execution-substrate.md) | Canonical Orbit doctrine; defines the public/internal name split |
| [ADR-0007a — Signal and ranking](../../../docs/decisions/0007a-orbit-signal-and-ranking-doctrine.md) | Signal taxonomy + lifecycle + multi-dimensional ranking |
| [ADR-0007b — Lifecycle and verification](../../../docs/decisions/0007b-orbit-lifecycle-and-verification-doctrine.md) | `PlannerItem` lifecycle + verification doctrine + audit grammar |
| [ADR-0007c — ERP attachment](../../../docs/decisions/0007c-orbit-erp-attachment-doctrine.md) | Typed `PlannerLink` / `PlannerRelation` + composition rules |
| [ADR-0007d — Temporal coordination](../../../docs/decisions/0007d-orbit-temporal-coordination-doctrine.md) | Temporal spine + scheduling/recurrence/reminders + durable execution boundary + sessions |
| [ADR-0035 — Three-layer surface and IDE anti-drift (PRIORITY #2)](../../../docs/decisions/0035-three-layer-surface-ide-anti-drift.md) | Three-layer rule that ADR-0040 reconciles for Orbit |
| [ADR-0040 — Orbit module rename (Phase 1: directory + import surface)](../../../docs/decisions/0040-orbit-planner-priority-2-closure.md) | Records the executed Phase-1 rename and documents Phase-2 / Phase-3 deferred scope |
| [`.cursor/rules/orbit-directory.mdc`](../../../.cursor/rules/orbit-directory.mdc) | Orbit directory contract (mirrors AGENTS.md + ADR-0006 + ADR-0040) |
| [`AGENTS.md` Orbit row](../../../AGENTS.md) | Quickstart entry point |
