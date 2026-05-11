# ADR-0007c — Orbit ERP attachment doctrine

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-12 |
| **Subordinate to** | [ADR-0006 — Orbit: operational execution substrate doctrine](0006-orbit-operational-execution-substrate.md) |
| **Sibling doctrines** | [ADR-0007a — Signal and ranking](0007a-orbit-signal-and-ranking-doctrine.md) · [ADR-0007b — Lifecycle and verification](0007b-orbit-lifecycle-and-verification-doctrine.md) · [ADR-0007d — Temporal coordination](0007d-orbit-temporal-coordination-doctrine.md) |
| **Affects** | `lib/features/planner/relations/**`, `lib/features/planner/integrations/**`, `lib/features/planner/commands/create-planner-link.ts`, all ERP modules that compose planner via its server APIs |
| **Related rules** | [`.cursor/rules/planner-directory.mdc`](../../.cursor/rules/planner-directory.mdc) |

---

## 1. Context

OneThing's `linkage` JSONB spoke carried cross-module entity references
on the same row that held execution state. That made attachment a
metadata afterthought: useful for Lynx grounding chips, invisible to the
ranker, and inconsistent across ERP modules.

Orbit's core strategic value is cross-ERP execution causality. Attachment
must be first-class, typed, and consistent across modules.

## 2. Decision — attachment is first class

Signals and items attach to ERP truth through a generic, typed reference
shape:

- `module` — owning feature module id (e.g. `hrm`, `purchase`,
  `accounting`, `lynx`)
- `entityType` — module-local entity type (e.g. `employee`,
  `purchase_order`, `journal_entry`, `truth_question`)
- `entityId` — opaque module-issued id
- `displayLabel` — short human label
- `href` — locale-internal URL for navigation
- `causalityReason` — short narrative describing why the planner row is
  linked to this ERP fact
- `temporalContext` — link into the shared temporal spine
- `auditContext` — pointer to relevant `iam_audit_event` rows when the
  attachment is audit-derived

This shape is implemented as `PlannerLink` (item ↔ ERP attachment) and
`PlannerRelation` (signal/item ↔ signal/item or signal/item ↔ ERP
attachment).

## 3. Decision — composition rules

### 3.1 ERP modules use planner server APIs only

ERP modules create signals and items by calling planner server APIs:

- `#features/planner/server` — server-only mutations and queries
- `#features/planner` — public composition entry

ERP modules must not import planner UI internals or planner client
internals.

### 3.2 Planner does not import ERP module internals

Planner must not import deep paths into ERP modules
(`#features/<module>/data/...`). When planner needs module data, it
consumes the module's public barrel (`#features/<module>`) and
`#features/<module>/server` only.

### 3.3 Causality is a real field

Every attachment must record `causalityReason`. Examples:

- `Vendor certificate expiring in 14 days`
- `Payroll discrepancy detected during finalize`
- `Inventory variance > 3% in cycle count`
- `Customer escalation flagged via webhook`
- `HR contract renewal window opens in 30 days`

A blank `causalityReason` is not acceptable.

### 3.4 Audit-derived attachments

When an attachment is derived from `iam_audit_event`, the
`auditContext` must include the audit row's `action` and `resourceId`
so renderers can reconstruct the narrative.

## 4. Decision — supported targets

Initial allowed `module` values, drawn from active ERP features:

- `hrm` — employees, contracts, payroll profiles, leave, attendance,
  documents
- `contacts` — counterparties
- `sale` — opportunities, orders, invoices, escalations
- `purchase` — requests, vendors, supplier documents
- `inventory` — variance, stock movement, replenishment
- `accounting` — journal entries, period close
- `knowledge` — sources, ingestion runs, documents
- `lynx` — truth questions, NL→SQL queries, recommendations
- `org-admin` — audit events, member actions, policy changes, import
  jobs
- `execution` — workflow runs and operational jobs

New `module` values require an ADR or same-PR amendment to ADR-0007c
plus a planner relations schema update.

## 5. Anti-task-manager posture

- No generic "tag" field that is used instead of typed attachments.
- No "project" string that is used instead of an `org-admin` /
  module-owned grouping.
- No free-form description that hides causality (causality must be
  structured per §3.3).

## 6. Conformance

A change conforms to ADR-0007c when:

1. New ERP integrations create signals / items via planner server APIs.
2. Each attachment records the full typed reference shape in §2.
3. `causalityReason` is non-empty.
4. ERP modules do not import planner UI / client internals.
5. Planner does not deep-import ERP module internals.

## 7. Non-goals

- Defining a generic "label" / "tag" system. ERP attachment replaces
  that pattern.
- Modelling cross-tenant references. Attachments are tenant-scoped via
  `organizationId`.
- Replacing ADR-0006's broader Orbit doctrine.
