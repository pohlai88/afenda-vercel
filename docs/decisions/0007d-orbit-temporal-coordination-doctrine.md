# ADR-0007d — Orbit temporal coordination doctrine

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-12 |
| **Subordinate to** | [ADR-0006 — Orbit: operational execution substrate doctrine](0006-orbit-operational-execution-substrate.md) |
| **Sibling doctrines** | [ADR-0007a — Signal and ranking](0007a-orbit-signal-and-ranking-doctrine.md) · [ADR-0007b — Lifecycle and verification](0007b-orbit-lifecycle-and-verification-doctrine.md) · [ADR-0007c — ERP attachment](0007c-orbit-erp-attachment-doctrine.md) |
| **Affects** | `lib/features/planner/scheduling/**`, `lib/features/planner/recurrence/**`, `lib/features/planner/automation/**`, `lib/features/planner/timeline/**`, `lib/features/planner/worklog/**`, `lib/features/execution/**` (durable runs) |
| **Related rules** | [`.cursor/rules/planner-directory.mdc`](../../.cursor/rules/planner-directory.mdc) · [`.cursor/rules/erp-primitives.mdc`](../../.cursor/rules/erp-primitives.mdc) |

---

## 1. Context

OneThing carried `recurrenceRule` directly on the row and executed
reminders / recurrence via Workflow DevKit entrypoints that wrote
`erp.execution.onething_*` audit events. iThink retained the same
pattern, and Lynx grounding consumed `temporalPast / Now / Next`
columns.

That model worked but conflated three concerns: a temporal model on the
row, scheduling/reminder configuration on the row, and durable
execution adjacent to the row. Orbit must coordinate execution across
ERP modules — temporal coordination needs to be a shared layer.

## 2. Decision — shared temporal spine

Planner consumes the shared `Past · Now · Next` temporal spine
(`#lib/erp/temporal-spine.shared`) for:

- detail narrative
- ranker "why now" derivation
- Lynx grounding summaries
- timeline view projection
- recurrence and reminder run logic

Planner must not redefine a parallel temporal model on `PlannerItem` or
`PlannerSignal`.

## 3. Decision — scheduling, recurrence, reminders

These are first-class planner entities, not row columns:

- `PlannerSchedule` — explicit scheduled execution window for an item
- `PlannerRecurrence` — recurrence rule, applied to a template
  signal/item (handled in `lib/features/planner/recurrence/**`)
- `PlannerReminder` — reminder timing for an item or session

Each entity records:

- `organizationId`
- target item or signal id
- temporal context (windows, RRULE, timezone)
- execution policy (idempotency key, retry posture)
- audit footprint (lifecycle audit events under `erp.planner.*`)

## 4. Decision — durable execution boundary

Recurrence and reminder runs are **durable execution**, owned by the
shared `lib/features/execution/` module and implemented via Workflow
DevKit:

- `enqueuePlannerRecurrenceWorkflowRun` — entry point for recurrence
- `enqueuePlannerReminderWorkflowRun` — entry point for reminders
- corresponding `*-run-payload.schema.ts` files in
  `lib/features/execution/schemas/` define the durable payload shape
- workflow implementations live under
  `lib/features/planner/automation/` and are reached via small
  `lib/features/execution/data/planner-*-run-entry.ts` files so
  `#features/planner` stays safe for non-server importers

Audit:

- run lifecycle uses `erp.execution.planner_recurrence.*` and
  `erp.execution.planner_reminder.*` (`run.started`, `run.completed`,
  `run.skipped`, `run.failed`)
- the legacy `erp.execution.onething_*` strings remain renderable for
  historical rows but no runtime code emits them

## 5. Decision — sessions and worklog

`PlannerSession` records operational continuity — when a person picks
up an item, works it, and stops. Sessions:

- start / stop via Server Actions in
  `lib/features/planner/commands/{start,stop}-planner-session.ts`
- belong to a single item (no cross-item sessions in v1)
- contribute to ranker context (active session boosts the item's rank
  temporarily)
- emit `erp.planner.session.*` audit events

## 6. Anti-task-manager posture

- No "due date" picker that becomes the only temporal input. Scheduling
  is configurable per the entities in §3.
- No "remind me" toggle that hides the underlying `PlannerReminder`
  contract.
- No cron entry in `vercel.json` for planner-specific digests. Orbit
  reuses durable runs, not bespoke crons.

## 7. Conformance

A change conforms to ADR-0007d when:

1. Temporal display / ranker logic uses the shared spine.
2. Scheduling, recurrence, and reminders use planner entities — not row
   columns or JSONB blobs.
3. Durable execution is enqueued through
   `#features/execution` entry points, not from Server Actions
   directly.
4. Run audit events use `erp.execution.planner_*` action strings.
5. Sessions are explicit `PlannerSession` rows, not implicit timestamp
   columns.

## 8. Non-goals

- Specifying the Workflow DevKit shape for individual workflows
  (handled by `lib/features/planner/automation/**`).
- Replacing the shared temporal spine — planner consumes it, does not
  redefine it.
- Replacing ADR-0006's broader Orbit doctrine.
