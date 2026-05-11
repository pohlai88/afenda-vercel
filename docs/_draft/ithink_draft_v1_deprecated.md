# iThink / OneThing — deprecated v1 draft

> **Status: archived. Not active doctrine.**
> The OneThing and iThink execution surfaces, schema, runtime, and product
> vocabulary have been fully retired from Afenda. Orbit (`lib/features/planner/`)
> is the only operational execution surface in the active product and runtime.
>
> This file is the sole committed narrative archive of the ideas worth carrying
> forward. It is **not** an ADR. It is **not** an implementation contract.
> Use it as historical context when designing or extending Orbit, and to
> interpret legacy `erp.onething.*` / `erp.ithink.*` rows that still exist in
> `iam_audit_event`.

Historical Drizzle migration files (`drizzle/0001_todo_onething.sql`,
`drizzle/0002_onething_rename.sql`, and any subsequent `onething`-related
SQL up to the destructive drop migration) remain committed for DB continuity.
The active `lib/db/schema.ts` no longer declares any `onething*` tables, and
no runtime code generates new `erp.onething.*` or `erp.ithink.*` audit
events.

---

## 1. Why these surfaces existed

OneThing and iThink coordinated several concerns inside a single execution
surface:

- consequence resolution (closing the loop on detected business reality)
- task / document interaction
- audit continuity (7W1H narrative on every mutation)
- temporal coordination (Past · Now · Next on every row)
- recurrence and reminder execution (Workflow DevKit entrypoints)
- Lynx grounding (the focused row drove machine-layer truth retrieval)

Both surfaces were heavily UX-driven (editorial document feel, single-line
ranked list, implicit capture, distributed-keyboard ownership) and proved
that operators value:

- a calm, narrative detail pane rather than a card-and-pill productivity grid
- titles that name the situation (consequence-first) rather than nouns
- implicit save / draft persistence rather than modal forms
- audit shown as a quiet sentence, not a label grid
- ambient time rather than dataset-style timestamps

Those product instincts carry forward; the schema, route tree, and module
structure do not.

---

## 2. Concepts worth carrying into Orbit

The following ideas were the durable value of OneThing / iThink. Each is
mapped to the Orbit / Planner primitives in the table at the end of this
document.

### 2.1 Operational lifecycle (OneThing)

```
detected → owned → blocked → resolving → ready_to_release → released → resolved → deprecated
```

Lessons preserved in Orbit:

- `detected` is a real state and is **not** the same as a queued task — it
  carries pressure but not yet a commitment.
- Resolution is stronger than completion. Resolve required consequence,
  proof, audit cache, and downstream safety to align.
- `deprecated` separates "no longer operationally valid" from "completed."

Orbit splits this into two primitives — see the mapping table.

### 2.2 Severity / pressure semantics

`low / medium / high / critical` drove:

- font weight in list rows (`high` / `critical` were semibold)
- Definition-of-Done proof requirements on resolve
- ranker priority and "why now" presentation

Lesson: a single ordinal severity is too coarse for true operational
pressure. Orbit replaces it with multi-dimensional pressure inputs
(`urgency`, `impact`, `severity`, `confidence`, `effort`,
`escalation_level`, `temporal_proximity`, `ownership_pressure`).

### 2.3 JSONB operational atom (the "four spokes")

Every OneThing row carried four JSONB columns:

| Spoke         | Purpose                                                              |
|---------------|----------------------------------------------------------------------|
| `linkage`     | Cross-module entity references (`module`, `id`, `label`, `meta`).    |
| `counterparty`| Who owes what: `you-owe / owes-you / system / shared`.               |
| `provenance`  | Origin of the row: `person / lynx / cron / approval / import`.       |
| `impact`      | `slipCostUsd`, `slaHorizonMs`, `blocksGate`, `unblocks`.             |

Lessons preserved:

- ERP attachment ("linkage") deserves first-class status, not metadata
  decoration. Orbit promotes it to the **ERP Attachment Layer**.
- Provenance is not a tag — it is an explicit role with system semantics.
  Orbit promotes it to **ownership roles** (`originating_system`,
  `automation_actor`, plus human roles).
- Impact must be modeled, not implied. Orbit folds it into pressure
  dimensions instead of one JSONB blob.

### 2.4 Temporal spine (Past · Now · Next)

Every row hydrated `temporalPast`, `temporalNow`, `temporalNext` JSONB
columns. These drove:

- the narrative detail pane (three paragraphs, no labels)
- Lynx grounding summaries
- the ranker's "why now" string

Lesson: time is not metadata. A consequence has a Past (what produced it),
a Now (what is true right now), and a Next (what must happen). Orbit
consumes the shared temporal spine (`#lib/erp/temporal-spine.shared`) for
the same purpose — Orbit does not invent a parallel time model.

### 2.5 IAM / 7W1H audit pattern

- Every mutation wrote an `iam_audit_event` row with an action of the form
  `erp.<module>.<object>.<verb>`.
- `describeAuditEvent7W1H()` rendered each event as a single natural
  sentence (no `WHO:` / `WHEN:` label grid).
- A trimmed audit cache lived on the row as `audit7w1h` JSONB so the detail
  pane could render the footer without re-fetching `iam_audit_event`.

Lesson: audit grammar belongs to the shared kernel
(`#lib/erp/audit-7w1h.shared` and `#lib/erp/audit-7w1h.server`). Surface
features compose it; they do not own it. Orbit continues this pattern with
`erp.planner.*` (and `org.simulation.*` / `org.governance.*` where
applicable).

### 2.6 Recurrence and reminders

- `recurrenceRule` (RRULE string) on the row, executed by Workflow DevKit
  entrypoints (`onething-recurrence-run.workflow.ts`,
  `onething-reminder-run.workflow.ts`).
- Recurrence runs were idempotent and audited as
  `erp.execution.onething_recurrence.*` / `erp.execution.onething_reminder.*`.

Lessons preserved in Orbit:

- Recurrence belongs to the **Temporal Layer**, not the row itself.
- Reminder execution must be durable (retryable, observable) — Workflow
  DevKit is the right substrate.
- Audit on durable runs uses the `erp.execution.*` namespace so the
  reasoning module (Lynx) does not generate authoritative ledger writes.

Orbit ships `enqueuePlannerRecurrenceWorkflowRun` and
`enqueuePlannerReminderWorkflowRun` for the same role; no OneThing
equivalents remain.

### 2.7 Lynx grounding

When a row was focused in the detail pane, OneThing registered the title,
consequence, and `linkage.entities[]` chips as Lynx context. Lynx
recommendations were attached as `predictions` JSONB on the row and
rendered as inline `<sup>` markers in the detail body.

Lessons preserved:

- The focused execution row is a high-signal grounding source for Lynx.
- Predictions belong **to the row**, not in a separate panel. They are
  consequence enrichment, not a sidebar feature.
- Lynx is sidecar / reasoning. It must not become a panel inside the
  execution surface.

Orbit attaches Lynx recommendations to `PlannerSignal` (`class =
recommendation`) and `PlannerItem` enrichments, not to a `predictions`
blob on the row.

### 2.8 Quick-add / inline parsing (iThink)

iThink added Planify-style token parsing inside the title input:

- `p1` / `p2` / `p3` / `p4` → priority
- `@` → label picker
- `#` → project picker
- `!` → reminder picker
- natural-language dates (debounced)

Lesson: capture wants to be fast and one-handed. Tokens beat modal forms.
However, do **not** model priority as a four-step ordinal — Orbit converts
this kind of input into pressure dimensions rather than `p1..p4`.

### 2.9 Sparse ordering with midpoint insertion

OneThing/iThink stored `position` integers in 1000-unit increments and
computed midpoints on reorder; collisions triggered a normalize pass.

Lesson: keep this pattern for views that genuinely need manual ordering.
Orbit's queue/timeline ranking is pressure-driven by default and should
not require manual reorder for most flows; the sparse-ordering pattern is
reserved for saved-view personalization.

### 2.10 Comments, attachments, sub-tasks exposure

OneThing wrote `onething_comment` and `onething_attachment` rows but the
v1 UI did not render them. iThink fixed this by adding:

- a comment thread in the detail panel
- an attachment list with a `+ Attach` affordance
- a sub-task list under the body using `parentOneThingId`

Lesson: "the action exists" is not the same as "the operator can see it."
Every Server Action that writes durable state must have a matching read
path on the surface. Orbit treats comments, attachments, and sub-relations
as first-class via `PlannerRelation` / `PlannerLink` / `PlannerActivity`.

### 2.11 Single-line ranked list + editorial detail

OneThing's row anatomy was deliberately minimal:

```
[focused-row rail (2px)] [title] [activity dot] [ambient time]
```

Forbidden in rows: severity badges, status pills, role chips, assignee
avatars, two-line previews, dataset-style timestamps.

The detail pane carried document-level typography (large headline,
narrative byline, prose body, inline `<sup>` predictions, quiet italic
"why now" caption).

Lesson: this UX intent is preserved by Orbit (queue-first, timeline-first,
editorial detail, no card chrome). Boards / cards remain secondary
views, not Orbit's identity.

### 2.12 Implicit capture / draft persistence

The composer was unnamed, single-line, and the draft persisted in
`localStorage` (`afenda:onething:composer:<scope>:<listId>`), debounced
240ms, multi-tab synchronized via `storage`, cleared only on Server Action
success.

Lesson: capture friction must be zero. Persist drafts client-side; clear
only on confirmed success. Orbit's Queue / Today surfaces should keep this
pattern.

### 2.13 Distributed keyboard ownership

OneThing avoided a central keyboard router. Each component (shell,
composer, toolbar) owned its own listeners. Cross-component intents flowed
through `window` events (`onething:focus-composer`,
`onething:toggle-resolve`).

Lesson: prefer distributed key ownership over a "keyboard provider." It
keeps each surface independently deletable.

### 2.14 Resolve hand-off (operational momentum)

Resolving a row never landed the operator on an empty detail pane. The
hand-off was deterministic:

1. focus the next ranked item, or
2. focus the previous ranked item, or
3. clear `?focus=` and dispatch `onething:focus-composer`.

Lesson: operational momentum is a doctrine, not an embellishment. Orbit
must preserve this behavior whenever an item leaves the active queue.

---

## 3. Concepts intentionally **not** carried forward

- A single `onething` row mixing detection (pressure) + execution (work).
  Orbit separates `PlannerSignal` and `PlannerItem` as required by ADR-0006.
- The `low / medium / high / critical` ordinal as the primary pressure
  axis. Orbit uses multi-dimensional pressure inputs.
- The four-JSONB-spoke model on a single table. Orbit splits these
  concerns into dedicated layers (Attachment, Ownership, Pressure,
  Temporal).
- `p1..p4` priority tokens in capture.
- A "Definition of Done" coupling severity to required artifacts. Orbit
  models verification as an explicit lifecycle state
  (`ready_for_review` → `verified` → `resolved`).
- A `predictions` blob on the row. Lynx attachments become `PlannerSignal`
  rows (`class = recommendation`) or item enrichments.
- `onething-recurrence-run` / `onething-reminder-run` workflows. Replaced
  by `planner-recurrence-run` / `planner-reminder-run`.
- `parentOneThingId` self-referencing parent column. Sub-relations move to
  `PlannerRelation`.

---

## 4. Legacy concept → Orbit concept mapping

| Legacy concept (OneThing / iThink)                              | Orbit / Planner equivalent                                                                                  |
|------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `onething` (single mixed row: pressure + execution)              | `PlannerSignal` (detected pressure) **plus** `PlannerItem` (executable work). They are intentionally separate. |
| `onething_list`                                                  | `PlannerView` (saved view) for org/personal queues; no per-list table.                                       |
| `onething_comment`                                               | `PlannerActivity` (commentary on an item) via planner relations.                                             |
| `onething_attachment`                                            | `PlannerLink` to evidence (Vercel Blob today; archive S3-compatible later).                                  |
| `parentOneThingId` (sub-tasks)                                   | `PlannerRelation` (`relationType = "subtask"` or domain-specific).                                           |
| `severity = critical|high|medium|low`                            | Pressure dimensions (`urgency`, `impact`, `severity`, `confidence`, `effort`, `escalation_level`, `temporal_proximity`, `ownership_pressure`) plus a derived display priority. |
| Lifecycle `detected → owned → blocked → resolving → ready_to_release → released → resolved → deprecated` | Split: signal lifecycle (`detected → correlated → promoted → deferred → suppressed → expired → auto_resolved → dismissed`) and item lifecycle (`triaged → assigned → scheduled → active → blocked → awaiting_external → ready_for_review → verified → resolved → deprecated → cancelled`). |
| `temporalPast` / `temporalNow` / `temporalNext` JSONB             | Shared temporal spine (`#lib/erp/temporal-spine.shared`) consumed by Orbit views, ranker, and intelligence layer. |
| `linkage` JSONB spoke                                            | ERP Attachment Layer (module / entityType / entityId / displayLabel / href / causalityReason).               |
| `counterparty` JSONB spoke                                       | Ownership roles (`owner`, `assignee`, `reviewer`, `watcher`, `escalation_owner`, `originating_system`, `automation_actor`). |
| `provenance` JSONB spoke                                         | Signal class (`anomaly`, `deadline`, `escalation`, `dependency`, `verification`, `review`, `alert`, `recommendation`, `prediction`, `manual_capture`) plus `originating_system`. |
| `impact` JSONB spoke (`slipCostUsd`, `slaHorizonMs`, `blocksGate`, `unblocks`) | Pressure dimensions (`impact`, `temporal_proximity`, `escalation_level`) plus `PlannerRelation` (`unblocks`). |
| `recurrenceRule` on the row                                      | `PlannerRecurrence` (Temporal Layer), executed by `planner-recurrence-run` workflow.                         |
| Reminders coupled to the row                                     | `PlannerReminder` (Temporal Layer), executed by `planner-reminder-run` workflow.                             |
| `predictions` JSONB on the row                                   | `PlannerSignal(class = "recommendation"|"prediction")` correlated to the item.                              |
| Definition of Done gating (severity-coupled proof on resolve)    | Item lifecycle states `ready_for_review` → `verified`; verification is a first-class step, not a side-effect of severity. |
| Quick-add `p1..p4` / `#project` / `@label` / `!reminder` tokens  | Capture parser may inform `PlannerItem` defaults, but priority is computed from pressure dimensions; do not store `p1..p4`. |
| Sparse `position` integers (1000-step + midpoint insert)         | Reserved per-view personalization on `PlannerView`; not the default ranking input.                           |
| Lynx grounding from focused row + `predictions` overlay          | Lynx grounds on the focused `PlannerItem` / `PlannerSignal`; recommendations enter as signals.               |
| `erp.onething.*` audit actions (`create`, `update`, `resolve`, `complete`, `snooze`, `reopen`, `deprecate`, `delete`, `prediction_*`, `state_transition`) | `erp.planner.*` audit actions emitted by planner Server Actions and workflows; legacy strings remain renderable for historical rows only. |
| `erp.ithink.*` audit actions                                     | Same — collapsed into `erp.planner.*`; legacy strings remain renderable.                                     |
| `erp.execution.onething_recurrence.*` / `erp.execution.onething_reminder.*` | `erp.execution.planner_recurrence.*` / `erp.execution.planner_reminder.*`.                                   |
| Dashboard route `/o/{slug}/dashboard/onething`                    | `/o/{slug}/dashboard/orbit` (and Orbit sub-surfaces: Queue / Today / Timeline / Signals / Sessions / Links). |
| Dashboard route `/o/{slug}/dashboard/ithink/**`                   | Same — collapsed into Orbit.                                                                                  |
| Account route `/account/onething`                                 | `/account/orbit` (personal queue), when surfaced.                                                            |
| `clearOneThingClientStorage()` (composer + viewed-id LRU wipe on sign-out) | Per-device privacy stays a doctrine; new equivalent (`clearPlannerClientStorage`, when needed) lives under `#features/planner/client`. |
| Knowledge source kind `"onething"`                                | Removed. Knowledge ingests `github_repo` and `manual` sources; planner items are linked, not ingested as docs. |
| Org admin import adapter `onething_import`                        | Removed. Use planner-native ingestion paths when needed (deferred).                                          |

---

## 5. Historical audit interpretation

Action strings still present in `iam_audit_event` for historical rows:

- `erp.onething.consequence.create`
- `erp.onething.consequence.resolve`
- `erp.onething.consequence.update`
- `erp.onething.consequence.deprecate`
- `erp.onething.consequence.state_transition`
- `erp.onething.consequence.prediction_accepted`
- `erp.onething.consequence.prediction_cleared`
- `erp.onething.onething.*` (early iteration before the `.consequence.` interior)
- `erp.ithink.consequence.create`
- `erp.ithink.consequence.update`
- `erp.ithink.consequence.resolve`
- `erp.ithink.consequence.complete`
- `erp.ithink.consequence.snooze`
- `erp.ithink.consequence.reopen`
- `erp.ithink.consequence.deprecate`
- `erp.ithink.consequence.delete`
- `erp.ithink.comment.create`
- `erp.ithink.attachment.create`
- `erp.execution.onething_recurrence.run.{started,completed,skipped,failed}`
- `erp.execution.onething_reminder.run.{started,completed,failed}`

These remain renderable by `describeAuditEvent7W1H()` through the shared
trailing-verb extractor. They are read-only artifacts; no active code path
in Afenda generates them.

---

## 6. Pointers for Orbit work

- ADR-0006 — Orbit: operational execution substrate doctrine.
- ADR-0007a — Orbit signal and ranking doctrine.
- ADR-0007b — Orbit lifecycle and verification doctrine.
- ADR-0007c — Orbit ERP attachment doctrine.
- ADR-0007d — Orbit temporal coordination doctrine.
- `.cursor/rules/planner-directory.mdc` — module boundary, anti-task-manager
  / anti-board-first posture.
- `lib/features/planner/**` — active runtime; product name "Orbit", internal
  domain "Planner".

When extending Orbit, prefer:

- queue / timeline / signal identity over boards.
- pressure dimensions over priority ordinals.
- planner server APIs over UI-internal coupling.
- shared kernels (`#lib/erp/temporal-spine.shared`,
  `#lib/erp/audit-7w1h.*`, `#lib/erp/crud-sap.shared`) over re-implementation.
