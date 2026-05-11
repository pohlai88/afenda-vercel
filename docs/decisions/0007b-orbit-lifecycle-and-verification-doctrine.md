# ADR-0007b — Orbit lifecycle and verification doctrine

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-12 |
| **Subordinate to** | [ADR-0006 — Orbit: operational execution substrate doctrine](0006-orbit-operational-execution-substrate.md) |
| **Sibling doctrines** | [ADR-0007a — Signal and ranking](0007a-orbit-signal-and-ranking-doctrine.md) · [ADR-0007c — ERP attachment](0007c-orbit-erp-attachment-doctrine.md) · [ADR-0007d — Temporal coordination](0007d-orbit-temporal-coordination-doctrine.md) |
| **Affects** | `lib/features/planner/commands/**`, `lib/features/planner/policies/**`, `lib/features/planner/audit/**` |
| **Related rules** | [`.cursor/rules/planner-directory.mdc`](../../.cursor/rules/planner-directory.mdc) |

---

## 1. Context

OneThing's `detected → owned → blocked → resolving → ready_to_release → released → resolved → deprecated`
lifecycle proved that "resolution is stronger than completion" — but it
coupled severity to required artifacts via the Definition of Done. The
result: high-severity rows hard-gated resolve on proof, while
low-severity rows could be closed without any verification path.

Orbit separates lifecycle from severity and treats verification as a
first-class state. This ADR captures the lifecycle and verification
rules for `PlannerItem`.

## 2. Decision — `PlannerItem` lifecycle

The canonical lifecycle:

```
triaged → assigned → scheduled → active → blocked
       → awaiting_external → ready_for_review → verified → resolved
       → deprecated → cancelled
```

Rules:

- **Human-created** items begin at `triaged`.
- **Signal-promoted** items begin at `triaged`.
- `assigned` requires an explicit `assignee` ownership role.
- `scheduled` requires a `PlannerSchedule` (handled in ADR-0007d).
- `active` is the canonical execution state.
- `blocked` requires a recorded blocker (signal, dependency, or
  free-form rationale on the activity log).
- `awaiting_external` is for handoffs to counterparties / external
  systems; it does not imply blocked.
- `ready_for_review` is mandatory when policy requires verification.
- `verified` requires a `reviewer` distinct from the `assignee` unless
  policy explicitly allows self-verification.
- `resolved` normally requires either `verified` or an explicit
  resolution rationale recorded on the activity log.
- `deprecated` means superseded or no longer operationally valid.
- `cancelled` means intentionally stopped before completion.

Orbit must never regress to `todo / doing / done` as its canonical
lifecycle.

## 3. Decision — verification doctrine

Verification is a domain concern, not a side-effect of severity.

### 3.1 Verification is explicit

Use the lifecycle states (`ready_for_review`, `verified`) to model
verification. Do **not** use severity to gate resolve.

### 3.2 Reviewer ownership

When policy requires verification:

- a `reviewer` ownership role must be recorded
- the reviewer must be distinct from the `assignee` unless policy
  explicitly allows self-verification (e.g. low-impact items)
- the reviewer's audit event is captured in the item's activity log

### 3.3 Policy authority

Verification policy is configured per ERP module via planner policies
(`lib/features/planner/policies/**`) and applied at transition time. It
must not be hard-coded into UI surfaces.

### 3.4 Resolution rationale

Items resolved without going through `verified` must carry an explicit
resolution rationale string (free text + structured reason code where
applicable). This is recorded in the activity log.

## 4. Decision — audit grammar

Orbit audit follows the shared kernel:

- action strings are `erp.planner.<object>.<verb>` built via
  `#lib/erp/crud-sap.shared`
- 7W1H sentences are produced by `#lib/erp/audit-7w1h.shared`
- the server-side composer (`#lib/erp/audit-7w1h.server`) writes
  `iam_audit_event` rows; rows include `actorSessionId`,
  `organizationId`, `resourceType`, `resourceId`, and minimal
  `metadata`.

Legacy `erp.onething.*` / `erp.ithink.*` strings remain renderable by
the same sentence builders but no new code path may emit them.

## 5. Anti-task-manager posture

- No `mark as done` button that bypasses verification.
- No "complete & next" shortcut that drops verification when policy
  requires it.
- No board / card UI that collapses `ready_for_review` and `verified`
  into a single column.

## 6. Conformance

A change conforms to ADR-0007b when:

1. New items use the canonical lifecycle in §2.
2. Verification is modelled via lifecycle states, not severity gating.
3. Reviewer ownership is recorded when policy requires verification.
4. Audit events use `erp.planner.*` and the shared 7W1H builder.
5. UI surfaces never collapse verification into "done."

## 7. Non-goals

- Defining the exact policy DSL for verification (deferred to a future
  ADR within `lib/features/planner/policies/**`).
- Specifying audit log retention (handled by org governance).
- Replacing ADR-0006's broader Orbit doctrine.
