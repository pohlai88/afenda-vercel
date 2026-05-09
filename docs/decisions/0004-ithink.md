# ADR-0004 — iThink: OneThing rebuilt on Planify backbone

| Field          | Value |
| -------------- | ----- |
| **Status**     | Accepted |
| **Date**       | 2026-05-10 |
| **Supersedes** | OneThing UI surface only (not OneThing domain model or operational schema) |
| **Companion**  | [ADR-0003 — Deprecate OneThing surface](./0003-onething-deprecation.md) |
| **Affects**    | `lib/features/ithink/**`, dashboard/account ithink routes, dashboard nav |

---

## 1. What iThink is

**iThink = OneThing operational model + Planify interaction backbone.**

iThink is not a different product. It is OneThing re-skinned with a usable interaction layer.

The OneThing domain model — lifecycle states, severity, JSONB spokes, audit, DoD, Lynx grounding — is preserved entirely.

The OneThing UI layer — the hidden composer, the read-only prose body, the invisible-until-you-type controls — is replaced.

---

## 2. What is preserved from OneThing (do not touch)

These are real, working, and valuable. iThink keeps every one of them.

### 2.1 Operational lifecycle

Eight states used in ranking, DoD evaluation, and audit:

```
detected → owned → blocked → resolving → ready_to_release → released → resolved → deprecated
```

### 2.2 Severity model

`low / medium / high / critical` — drives font weight in list rows, DoD proof requirements on resolve, and ranker priority.

### 2.3 JSONB operational atom spokes

All four are hydrated on every row and must stay:

| Spoke         | What it contains                                                      | Currently used by             |
|---------------|-----------------------------------------------------------------------|-------------------------------|
| `linkage`     | Cross-module entity refs (`module`, `id`, `label`, `meta`)           | Lynx grounding chips          |
| `counterparty`| Who owes what: `you-owe / owes-you / system / shared`                | Detail pane byline            |
| `provenance`  | How the item was created: `person / lynx / cron / approval / import` | Server ranker `whyNow`        |
| `impact`      | `slipCostUsd`, `slaHorizonMs`, `blocksGate`, `unblocks`              | Resolve severity signal       |

### 2.4 Temporal spine

`temporalPast`, `temporalNow`, `temporalNext` — JSONB columns powering the consequence narrative in the detail pane and Lynx grounding summaries.

### 2.5 IAM audit

Every mutation writes `iam_audit_event` with `erp.onething.*` / `erp.ithink.*` action strings. This is non-negotiable. iThink uses `erp.ithink.*` for new operations.

### 2.6 Definition of Done (DoD)

Resolve is gated by DoD checks for `high` and `critical` severity:
- Consequence closed
- Owner decision recorded
- Evidence attached
- Predictions handled

DoD remains advisory at `medium` and `low`. This logic lives in `onething-onething-state.server.ts` and is reused unchanged.

### 2.7 Predictions

AI-generated inline consequence predictions stored on the row (`predictions` JSONB). Rendered as `<sup>` markers in the detail body.

### 2.8 7W1H structured audit

Every audit event is described via `describeAuditEvent7W1H()` as a natural sentence, cached in `audit7w1h` JSONB on the row for the detail pane footer.

### 2.9 Recurrence via Workflow DevKit

`recurrenceRule` (RRULE string) + `onething-recurrence-run.workflow.ts`. Already wired. iThink surfaces the RRULE editor in the detail panel.

### 2.10 Lynx grounding

When a task is open in the detail pane, `setGrounding()` registers the task title, consequence, and `linkage.entities[]` chips as Lynx context. This stays in iThink.

### 2.11 All existing Server Actions

All mutations work and are reused directly:

- `createOrgOneThing` / `createPersonalOneThing`
- `resolveOrgOneThing` / `resolvePersonalOneThing`
- `completeOrgOneThing` / `completePersonalOneThing`
- `deprecateOrgOneThing` / `deprecatePersonalOneThing`
- `reopenOrgOneThing`
- `snoozeOrgOneThingOneHour`
- `deleteOrgOneThing` / `deletePersonalOneThing`
- `addOrgOneThingComment`
- `addOrgOneThingAttachment`
- `purgeResolvedOrgOneThing`

### 2.12 All existing DB tables

No migration in v1. iThink reads and writes the same tables:

- `onething` — tasks
- `onething_list` — projects/lists
- `onething_comment` — comments (write existed; iThink adds display)
- `onething_attachment` — attachments (write existed; iThink adds display)

---

## 3. What is broken in OneThing that iThink fixes (UI failures)

These are not missing features. These are things that exist in the backend but are invisible to operators because the UI surface does not expose them.

| Broken surface              | What exists in backend           | iThink fix                                      |
|-----------------------------|----------------------------------|-------------------------------------------------|
| Capture not discoverable    | `createOrgOneThing` works        | Always-visible `+ Add task` row at top of list  |
| Title hard-rejected on save | Zod strict gate on create        | Lenient title schema — any string accepted       |
| "Add note" has no surface   | `consequence` column exists      | Always-editable body textarea in detail panel   |
| `dueAt` never shown         | Column selected in every query   | Due date chip on list row + picker in detail    |
| `assigneeUserId` never shown| Column selected in every query   | Assignee display + picker in detail             |
| `recurrenceRule` not visible| Workflow wired on complete       | RRULE editor in detail panel (folded)           |
| Comments write-only         | `onething_comment` table + action| Comment thread rendered in detail panel         |
| Attachments write-only      | `onething_attachment` + Blob API | Attachment list rendered + `+ Attach` button    |
| Sub-tasks `parentOneThingId`| Column exists, not queried       | Sub-task list under body + inline capture row   |
| No mobile entry point       | All actions work on mobile       | FAB fixed bottom-right on mobile                |
| No navigation projections   | Overdue/due-soon queries exist   | Inbox / Today / Scheduled views wired           |
| List sharing no UI          | `shareTokenHash` + rotate action | Share link UI in project settings               |
| Cron not scheduled          | Route exists at `/api/cron/onething-digest` | Add to `vercel.json` crons        |

---

## 4. What iThink takes from Planify backbone (specifically)

These are patterns from [Planify](https://github.com/alainm23/planify.git) confirmed by direct source audit of `core/QuickAddCore.vala`, `core/Services/Store.vala`, `src/Layouts/Sidebar.vala`, `src/Layouts/ItemRow.vala`, `src/MainWindow.vala`.

### 4.1 Always-visible capture row

Planify: `Adw.StatusPage` empty state with `"Press 'a' to create a new task"` + `prepare_new_item()` called from section header context menu.

iThink: An `<input>` row pinned at the top of the list view that is always visible, always focusable, never hides behind a draft state.

### 4.2 Quick-add inline token parsing

Planify `QuickAddCore.vala` parses tokens in the title input on every keystroke:

- `p1` / `p2` / `p3` / `p4` → priority (regex `(?:^|\s)(p[1-4])(?:$|\s)`)
- `@` → opens label picker at cursor position
- `#` → opens project picker
- `!` → opens reminder picker
- Natural language dates via `chrono.parse()` debounced at 800ms

iThink: `parse-ithink-draft.shared.ts` implements the same token logic. Tokens are stripped from the title before submit. Ghost preview shows parsed metadata below the input.

### 4.3 Checkbox on list rows

Planify `ItemRow.vala`: `Gtk.CheckButton` at left of every row. Click completes without opening detail.

iThink: Checkbox left of every list row. Click calls `completeOrgOneThing` / resolves low-severity directly. Clicking the title text opens detail.

### 4.4 Metadata visible on list rows

Planify shows on each row: due date chip, label chips, reminder indicator, description indicator, project name (when in cross-project views).

iThink shows on each row: due date chip, severity dot (replaces priority color), activity dot (existing), ambient time (existing). Labels in v2.

### 4.5 Sparse ordering with midpoint insertion

Planify `QuickAddCore.vala` `generate_child_order()`: items have spaced `child_order` integers (increments of 1000). Reorder computes `(prev.child_order + next.child_order) / 2`. On collision, `normalize_orders()` resets all to 1000-spaced values.

iThink: `ithink-ordering.shared.ts` implements same logic against `position` column (already on the `onething` table).

### 4.6 Sub-tasks

Planify `Item.vala`: `parent_id` on item, `Widgets.SubItems` renders nested list, collapsible.

iThink: `parentOneThingId` column already exists on `onething` table but is never SELECTed. Add to `ONETHING_ROW_SELECT`, add sub-task list in detail panel, add inline capture row for sub-tasks.

### 4.7 Sections within a project

Planify `SectionRow.vala`: each project has sections. Items belong to a section. Default "no section" inbox section is always present.

iThink v1: single section per list (existing behavior). Section grouping deferred to v2 when a migration adds the `onething_section` table.

### 4.8 Sidebar navigation as view router

Planify `Sidebar.vala` + `MainWindow.vala`: sidebar is a view router emitting `PaneType.FILTER` or `PaneType.PROJECT` events. Same item model powers Inbox, Today, Scheduled, Labels, and Project views.

iThink: `ithink-sidebar.tsx` renders fixed navigation nodes (Inbox, Today, Scheduled) plus dynamic lists from `listOneThingListsForOrg` (Projects) and future labels. Each node is a route. Same `onething` rows power all views via query filters.

### 4.9 Mobile FAB (Magic Button)

Planify `MagicButton.vala`: 48×48px FAB, bottom-right, always visible. Also supports drag-and-drop to insert at position.

iThink: Fixed `<button>` bottom-right at `lg:hidden`. Clicks open quick-add modal or focus the inline capture row.

### 4.10 Project list management

Planify: sidebar shows all projects, collapsible. Right-click to create, archive, delete.

iThink: sidebar shows all `onething_list` rows from `listOneThingListsForOrg`. `+ New list` inline action calls a new Server Action `createOrgOneThingList`.

---

## 5. Implementation order

Ship in this order — each step is independently deployable:

1. **Inbox route + always-visible add row** (`/dashboard/ithink` + `ithink-shell.tsx` + `ithink-list-view.tsx` with a real visible input at top)
2. **Lenient create + quick-add parser** (drop strict title gate, add `parse-ithink-draft.shared.ts`, wire modal + FAB)
3. **Detail panel with editable note + due/assignee display** (`ithink-detail-panel.tsx` with textarea body + metadata row)
4. **Comments and attachments rendered** (add `listOneThingComments` + `listOneThingAttachments` queries, render in detail)
5. **Today / Scheduled views** (filter queries over existing columns)
6. **Sidebar + Projects navigation** (wire `listOneThingListsForOrg`, collapsible list)
7. **Sub-tasks** (add `parentOneThingId` to SELECT, sub-task list in detail)
8. **Route redirects from OneThing** (onething → ithink, old routes become stubs)
9. **Cron wire** (add `onething-digest` to `vercel.json`)

---

## 6. Module contract

```
lib/features/ithink/
  actions/          — thin wrappers around OneThing mutations, erp.ithink.* audit strings
  data/             — ithink.queries.server.ts (same tables, fixed SELECT), ithink-ordering.shared.ts
  components/
    ithink-shell.tsx
    ithink-sidebar.tsx
    ithink-list-view.tsx
    ithink-task-row.tsx
    ithink-detail-panel.tsx
    ithink-quick-add.tsx
    hooks/
      parse-ithink-draft.shared.ts
  schemas/          — lenient title schema (no assertOneThingTitleIsSituation)
  constants.ts
  types.ts
  index.ts
  client.ts
  server.ts
```

Public import doors:
- `#features/ithink` — RSC / Server Component composition
- `#features/ithink/client` — client-safe types, actions, pure helpers
- `#features/ithink/server` — server-only queries and adapters

Routes:
- `app/[locale]/o/[orgSlug]/dashboard/ithink/**` — org surface
- `app/[locale]/(iam)/account/ithink/**` — personal surface

---

## 7. What is deliberately out of scope for v1

- Board/kanban view
- Drag-and-drop (deferred to after ordering service exists)
- Section table split (new `onething_section` migration)
- Label management (new `onething_label` migration)
- Saved filter table
- Multi-reminder table
- Rewriting OneThing business logic
