# ADR-0007a — Orbit signal and ranking doctrine

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-12 |
| **Subordinate to** | [ADR-0006 — Orbit: operational execution substrate doctrine](0006-orbit-operational-execution-substrate.md) |
| **Sibling doctrines** | [ADR-0007b — Lifecycle and verification](0007b-orbit-lifecycle-and-verification-doctrine.md) · [ADR-0007c — ERP attachment](0007c-orbit-erp-attachment-doctrine.md) · [ADR-0007d — Temporal coordination](0007d-orbit-temporal-coordination-doctrine.md) |
| **Affects** | `lib/features/planner/signals/**`, `lib/features/planner/ranking/**`, `lib/features/planner/pressure/**` |
| **Related rules** | [`.cursor/rules/planner-directory.mdc`](../../.cursor/rules/planner-directory.mdc) |

> ADR-0007a–0007d are subordinate Orbit doctrines. They share the **0007**
> numeric prefix with [`0007-turborepo-single-package-verify-cache.md`](0007-turborepo-single-package-verify-cache.md) but are an
> independent ledger track distinguished by the letter suffix.
> [`0008-vitest-nextjs-unit-test-configuration.md`](0008-vitest-nextjs-unit-test-configuration.md) is also unrelated.

---

## 1. Context

OneThing / iThink coalesced *detection of operational pressure* and
*execution of work* into a single `onething` row. That coupling made it
impossible to express signals that auto-resolve, correlate, escalate, or
suppress without creating durable work — and forced every detected event
to inherit ordinal `low / medium / high / critical` severity.

Orbit replaces that model with two primitives (`PlannerSignal` and
`PlannerItem`) and a multi-dimensional pressure model. This ADR captures
the signal and ranking rules that other Orbit work must honour.

## 2. Decision — signal doctrine

`PlannerSignal` is the unit of *detected operational pressure*. It is a
first-class entity, not a transient log line and not a task in disguise.

### 2.1 Signal classes

The initial taxonomy is:

- `anomaly` — measured deviation from expected state
- `deadline` — temporal proximity to a contractual or policy boundary
- `escalation` — explicit handoff from a counterparty or workflow
- `dependency` — blocking relation observed
- `verification` — verification required by policy or governance
- `review` — human review required by policy or governance
- `alert` — operational alert (system health, integration failure, SLA)
- `recommendation` — Lynx / intelligence recommendation
- `prediction` — Lynx / intelligence forecast
- `manual_capture` — human-entered observation

New signal classes require an ADR or a same-PR amendment to ADR-0007a.

### 2.2 Signal lifecycle

```
detected → correlated → promoted → deferred → suppressed → expired → auto_resolved → dismissed
```

A signal may:

- expire without ever producing an item (e.g. a deadline passes after the
  underlying ERP fact changes)
- correlate with other signals before promotion
- promote into a `PlannerItem` (becoming the executable counterpart)
- auto-resolve when ERP truth re-aligns

### 2.3 Signal separation from items

- A signal must not own execution state. Execution state lives on
  `PlannerItem`.
- One signal may produce many items (`promoted_to_items[]`).
- Many signals may merge into one item (`item.linked_signals[]`).
- A signal that fires repeatedly without producing work must remain
  collapsible — it is information about pressure shape, not a queue of
  tasks.

### 2.4 Signal sources

Allowed sources, by class:

- ERP modules (via planner server APIs only — no UI internals)
- Workflow DevKit run completions and failures
- audit triggers
- Lynx (`recommendation`, `prediction`)
- humans (`manual_capture`)

A signal source must record `originating_system` and, when applicable,
`automation_actor`.

## 3. Decision — ranking doctrine

Orbit ranking is **multi-dimensional**, not ordinal.

### 3.1 Pressure dimensions (canonical)

- `urgency`
- `impact`
- `severity`
- `confidence`
- `effort`
- `escalation_level`
- `temporal_proximity`
- `ownership_pressure`

These dimensions are the canonical inputs. A derived `displayPriority`
(`low | medium | high | critical`) may be exposed for UI affordances, but
implementations must compute it from the dimensions — not store it as the
primary truth.

### 3.2 Ranking inputs

The ranker consumes:

- pressure dimensions on `PlannerSignal` and `PlannerItem`
- temporal context from the shared spine (`#lib/erp/temporal-spine.shared`)
- ownership context (assignee load, escalation owner, originating system)
- ERP attachment metadata (causality reason, blocking links)

The ranker must not consume:

- a single ordinal `priority` column as the dominant input
- raw audit row counts
- UI focus state

### 3.3 Display rules

- The queue surface shows the highest-pressure items first.
- "Why now" must be a quiet narrative string derived from the dominant
  pressure dimensions and temporal proximity. It is not a label grid.
- Boards / kanban views are secondary and may not bypass pressure ranking
  to enforce manual reorder by default.

### 3.4 Anti-task-manager posture

Orbit must **not** present:

- a `p1 / p2 / p3 / p4` priority picker as the primary capture input
- a single severity badge on every list row
- a productivity-style "label everything" UX surface

Pressure is computed, not picked from a dropdown.

## 4. Conformance

A change conforms to ADR-0007a when:

1. New detection logic emits `PlannerSignal` rows with an explicit class
   drawn from §2.1.
2. Signal lifecycle uses §2.2 states; no parallel signal lifecycle is
   defined elsewhere.
3. Signals never own execution state — they relate to items.
4. Ranking input is multi-dimensional per §3.1; `displayPriority` is
   derived, not stored as truth.
5. UI affordances follow the anti-task-manager posture in §3.4.

## 5. Non-goals

This ADR does not:

- specify the exact ranking formula (that is intentionally implementation
  detail and may evolve)
- define the storage shape of pressure dimensions (handled by Drizzle
  schema for `lib/features/planner/`)
- replace ADR-0006's broader Orbit doctrine
