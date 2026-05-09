# ADR-0004a — iThink Development Phases

| Field         | Value |
|---------------|-------|
| **Status**    | Accepted |
| **Date**      | 2026-05-10 |
| **Parent**    | [ADR-0004 — iThink](./0004-ithink.md) |
| **Scope**     | Complete slice definition for iThink v1 — no DB schema migrations |

---

## Evidence base

Every deliverable in this document was verified against actual source files and the Next.js 16 documentation (Context7 `/vercel/next.js`, queried 2026-05-10).
Claims without a source citation are disallowed.

| Verified fact | Source |
|---------------|--------|
| Only update mutation for `onething` is `updateOneThingState(id, patch)` — patches `state`, `snoozeUntil`, `updatedAt` only. No `updateOrgOneThing` general mutation exists. | `lib/features/onething/data/onething.mutations.server.ts:204` |
| `consequence` column: `text("consequence").notNull().default("")` | `lib/db/schema.ts:293` |
| `parentOneThingId` column exists, nullable, no FK: `text("parentOneThingId")` | `lib/db/schema.ts:299` |
| `parentOneThingId` is NOT in `ONETHING_ROW_SELECT` | `lib/features/onething/data/onething.queries.server.ts:123–150` |
| Only 2 OneThing page routes exist: `dashboard/onething/page.tsx` and `account/onething/page.tsx`. No `[id]` detail route exists anywhere. | `app/[locale]/o/[orgSlug]/dashboard/onething/page.tsx`, `app/[locale]/(iam)/account/onething/page.tsx` |
| All OneThing Server Actions call `revalidateOrgOneThingDashboard()` which revalidates `ORG_DASHBOARD_ONETHING = "/onething"` | `lib/features/onething/data/onething-revalidate.server.ts:12–17` |
| `organizationDashboardPath` union does not include `"ithink"`. `DASHBOARD_NAV_MODULES` array does not include `"ithink"`. | `lib/dashboard-module-paths.ts:36–83` |
| `completeOrgOneThing` sets state→`resolved` with no DoD check. `resolveOrgOneThing` enforces DoD for high/critical and writes 7W1H audit. Both are terminal. | `actions/complete-org-onething.ts:20–23`, `actions/resolve-org-onething.ts:81–93` |
| `oneThingComment` columns: `id`, `oneThingId`, `authorUserId`, `body`, `createdAt` | `lib/db/schema.ts:356–375` |
| `oneThingAttachment` columns: `id`, `oneThingId`, `url`, `contentSha256`, `mimeType`, `sizeBytes`, `createdAt` | `lib/db/schema.ts:338–354` |
| `insertOrgOneThing` throws `new Error("onething insert returned no row")` on insert failure — does not silently return. | `lib/features/onething/data/onething.mutations.server.ts:168` |
| Title classifier: `classifyOneThingTitleIssue` blocks `single_token`, `module_noun_prefix`, `technical_event_tail`. The refine `assertOneThingTitleIsSituation` applies this classifier. | `lib/features/onething/schemas/onething.schema.ts:28–58` |
| Next.js 16: `params` and `searchParams` are `Promise`-wrapped — must be `await`-ed in every `page.tsx`, `layout.tsx`, and `generateMetadata`. | Next.js docs — "Update Next.js Async Page & Metadata params and searchParams Access" |
| `revalidatePath` must be called **before** `redirect` in Server Actions — `redirect` throws a control-flow exception that stops all subsequent execution. | Next.js docs — "Redirect after Mutation in Next.js Server Actions" |
| `notFound()` must be called **before any `<Suspense>` boundary** to ensure a real HTTP 404 status code is sent before streaming starts. | Next.js docs — "Triggering 404 Status Before Streaming in Next.js" |
| `loading.tsx` alongside `page.tsx` automatically wraps the page in a `<Suspense>` boundary and serves as the waiting contract. | Next.js docs — "Implement Page-Level Loading UI with loading.js" |

---

## Principles (non-negotiable)

1. Each phase must be **independently deployable** — it ships alone without breaking an in-flight phase.
2. Each phase is **done only when every exit criterion passes** — not when code is written.
3. iThink owns its own SELECT projections. OneThing's `ONETHING_ROW_SELECT` is not modified.
4. iThink action wrappers revalidate `/ithink` routes, not `/onething` routes.
5. No new DB schema migration in any v1 phase.
6. `OneThingRow` is imported directly — no type alias that pretends to be something different.
7. Personal account surface (`account/onething`) is **out of scope for v1**. Its routes are not redirected in Phase 6.
8. **All `page.tsx` and `layout.tsx` files use `await params`** — `params` is a `Promise<{...}>` in Next.js 16. Accessing it synchronously is a runtime error.
9. **`revalidatePath` must be called before `redirect` in Server Actions** — `redirect` throws a control-flow exception. Any code after `redirect` does not execute.
10. **Tier B enrichment (comments, attachments, sub-tasks) must render inside `<Suspense>` boundaries** — they are async Server Components that stream in after the detail panel shell commits. They never block the initial render.
11. **`notFound()` must be called before any `<Suspense>` boundary** when checking entity existence — ensures the HTTP status is 404 before streaming starts, not 200 with deferred content.

---

## Structural additions required before any phase begins

These two changes must be made first and committed. Every phase depends on them.

### A. `lib/dashboard-module-paths.ts` — add `"ithink"`

Evidence: `organizationDashboardPath` union (`lib/dashboard-module-paths.ts:38–47`) does not include `"ithink"`. `DASHBOARD_NAV_MODULES` (`lib/dashboard-module-paths.ts:66–77`) does not include `"ithink"`. `ORG_DASHBOARD_ITHINK` constant does not exist.

Changes:
- Add `"ithink"` to the `modulePath` union in `organizationDashboardPath`.
- Add `"ithink"` to `DASHBOARD_NAV_MODULES` array.
- Export `ORG_DASHBOARD_ITHINK = "/ithink" as const`.

### B. `lib/features/onething/data/onething.mutations.server.ts` — add `updateOneThingFields`

Evidence: Only `updateOneThingState` (patches `state/snoozeUntil/updatedAt`) exists. No mutation updates `title`, `consequence`, `dueAt`, `assigneeUserId`. `lib/features/onething/data/onething.mutations.server.ts:204`.

Add:

```ts
export async function updateOneThingFields(
  oneThingId: string,
  patch: Partial<{
    title: string
    consequence: string
    dueAt: Date | null
    assigneeUserId: string | null
  }>
): Promise<void> {
  await db
    .update(oneThing)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(oneThing.id, oneThingId))
}
```

This is in `lib/features/onething/data/` (not iThink) because it operates on the shared table and may be needed by OneThing too. iThink imports it.

**Server Action signature note:** All iThink Server Actions that return state for `useActionState` must use the signature `(prevState: T, formData: FormData): Promise<T>`. `create-ithink.ts` matches `createOrgOneThing`'s existing signature `(_prev: CreateOrgOneThingFormState, formData: FormData)`.

**`revalidatePath` ordering rule:** In every iThink Server Action that mutates then revalidates: call `revalidateOrgIThinkDashboard()` **before** any `redirect()` call. `redirect()` throws a control-flow exception — anything after it does not execute. Current iThink actions do not redirect after mutation (they return state), so this only applies if a future action adds a post-mutation redirect.

---

## Phase 1 — Capture & Shell

**Delivers:** A route exists. The list loads. Typing any non-empty string and pressing Enter saves a task.

### Deliverables

| File | What it does | Evidence for design decision |
|------|-------------|------------------------------|
| `lib/features/ithink/schemas/ithink.schema.ts` | `z.string().trim().min(1).max(500)` — no `assertOneThingTitleIsSituation` refine. Max 500 is a safe bound (not "any string"). | `onething.schema.ts:48–57` — classifier exists; iThink deliberately omits the refine |
| `lib/features/ithink/types.ts` | Imports and re-exports `OneThingRow` from `#features/onething/types` directly — no alias, no pretend type. Adds `IThinkListRow = OneThingListRow`, `IThinkViewId = "inbox" \| "today" \| "scheduled"`. | Type aliases that add no constraint are forbidden by code-quality |
| `lib/features/ithink/constants.ts` | Imports `ONETHING_STATES`, `ONETHING_SEVERITIES`, `ONETHING_DEFAULT_LIST_SLUG` from `#features/onething/constants` and uses them directly — no re-export. Adds `ITHINK_ACTIVE_STATES = ["detected", "owned", "blocked", "resolving"] as const` for list view filters (matches the states used in `listOverdueOneThingSummariesForOrganization`). | `lib/features/onething/data/onething.queries.server.ts:315` |
| `lib/features/ithink/data/ithink.queries.server.ts` | `listIThinkForList(listId, orgId)` — uses same `onething` table. Adds `parentOneThingId: oneThing.parentOneThingId` to the SELECT that OneThing's `ONETHING_ROW_SELECT` omits. Active-only: `inArray(state, ITHINK_ACTIVE_STATES)`. | `lib/db/schema.ts:299` confirms column exists; `onething.queries.server.ts:123–150` confirms it is absent from OneThing's SELECT |
| `lib/features/ithink/data/ithink-revalidate.server.ts` | `revalidateOrgIThinkDashboard()` calls `revalidatePath(toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_ITHINK), "page")`. | `lib/features/onething/data/onething-revalidate.server.ts:12–17` — iThink must revalidate `/ithink`, not `/onething` |
| `lib/features/ithink/data/ithink-ordering.shared.ts` | `computeInsertPosition(prev: number \| null, next: number \| null): number` — midpoint of prev/next, spaced 1000 apart when inserting at head/tail. `normalizePositions(ids: string[]): Array<{id: string, position: number}>` — resets to 1000-spaced values. Pure functions, no DB access. | `lib/db/schema.ts:300` — `position: integer("position").notNull().default(0)` exists |
| `lib/features/ithink/actions/create-ithink.ts` | `"use server"`. Calls `requireOrgSession()`. Validates with lenient schema. Calls `insertOrgOneThing` directly. Writes `iam_audit_event` with action `erp.ithink.consequence.create`. Calls `revalidateOrgIThinkDashboard()`. Returns `{ ok: boolean, errors?: {...} }`. | `create-org-onething.ts:20–129` — iThink wrapper follows same pattern, different audit string and revalidate target |
| `lib/features/ithink/components/ithink-shell.tsx` | `"use client"`. 3-column layout. Left `<aside>` sidebar placeholder. `<main>` list column. Right `<aside>` detail column with empty `<div data-slot="subtasks" />`, `<div data-slot="comments" />`, `<div data-slot="attachments" />` placeholders for Phase 4. Selected task ID in local state. | Slots reserved now so Phase 4 does not restructure Phase 3's layout |
| `lib/features/ithink/components/ithink-list-view.tsx` | `"use client"`. Visible `<input placeholder="Add task…">` pinned at top, always rendered, never hidden. `onKeyDown` Enter → calls `createIThinkAction`. Uses `useActionState`. | OneThing's composer is `border-0 bg-transparent` — the explicit anti-pattern this fixes |
| `lib/features/ithink/components/ithink-task-row.tsx` | `"use client"`. Props: `row: OneThingRow`, `isSelected: boolean`, `onSelect: (id: string) => void`. Renders title only. Checkbox and due chip added in Phase 3. | Phase 3 extends this; Phase 1 needs the row to be clickable to prove selection works |
| `lib/features/ithink/index.ts` | Barrel for RSC composition. Exports shell, page-level queries, types. | AGENTS.md §6 module contract |
| `lib/features/ithink/tests/ithink-ordering.test.ts` | Vitest unit tests for `computeInsertPosition` and `normalizePositions`. Tests: insert at head, insert at tail, insert between two items, collision case triggers normalize. | `ithink-ordering.shared.ts` is a pure function — no excuse to skip tests |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/layout.tsx` | `async` Server Component. `const { locale, orgSlug } = await params` — both are `Promise`-wrapped in Next.js 16. Calls `requireOrgSession()`. Renders `{children}`. | AGENTS.md — layout owns auth boundary; Next.js 16 async params |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/page.tsx` | `async` Server Component. `const { locale, orgSlug } = await params`. Gets session, then parallelizes independent fetches: `const [defaultListId, lists] = await Promise.all([ensureDefaultOneThingListForOrg(orgId), listIThinkListsForOrg(orgId)])`. Then loads items: `const rows = await listIThinkForList(defaultListId, orgId)`. Passes rows + lists to `<IThinkShell>`. | Next.js docs — `Promise.all` for parallel independent fetches. `ensureDefaultOneThingListForOrg` and `listIThinkListsForOrg` are independent. |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/loading.tsx` | Skeleton matching list shape: capture input skeleton at top, 8 placeholder task row skeletons below. Automatically wraps page in a `<Suspense>` boundary. | Next.js docs — "Implement Page-Level Loading UI with loading.js"; AGENTS.md §15 — every serious route surface considers `loading.tsx` |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/error.tsx` | `"use client"`. Renders a recovery UI: error message + "Go back" button. Catches uncaught render/data errors below the layout. | AGENTS.md `error-boundaries.mdc` — every serious route surface considers `error.tsx` |
| `lib/dashboard-module-paths.ts` | Structural addition A above. | `lib/dashboard-module-paths.ts:36–83` |

### Boundaries

- iThink does NOT modify `lib/features/onething/data/onething.queries.server.ts`. It owns its own SELECT in `ithink.queries.server.ts`.
- iThink does NOT call `revalidateOrgOneThingDashboard()`. It calls its own `revalidateOrgIThinkDashboard()`.

### Exit criteria

- [ ] `GET /[locale]/o/[slug]/dashboard/ithink` returns 200, list renders.
- [ ] `<input placeholder="Add task…">` is visible in the DOM on page load with no user action.
- [ ] Typing any string ≥ 1 character (after trim) and pressing Enter creates a row that appears in the list.
- [ ] Typing a string that would fail OneThing's title classifier (e.g. `"Contact:"`, `"ok"`) also succeeds — confirming the lenient schema is active.
- [ ] `pnpm verify` passes.

---

## Phase 2 — Quick Capture

**Delivers:** NL token parsing in the inline row. Quick-add modal. Mobile FAB.

### Deliverables

| File | What it does | Evidence |
|------|-------------|----------|
| `lib/features/ithink/data/parse-ithink-draft.shared.ts` | Pure function `parseIThinkDraft(raw: string, lists: IThinkListRow[], nowUtc: Date): IThinkDraftParsed`. Returns `{ cleanTitle, severity, dueAt, listId, labelTokens }`. Token rules below. `nowUtc` is passed in — caller is responsible for supplying current UTC time, preventing server/browser TZ mismatch. | TZ bug identified in critique: the function must not call `new Date()` internally |
| `lib/features/ithink/tests/parse-ithink-draft.test.ts` | Vitest unit tests. Cases: `p1` strips to `critical`, `today` with `nowUtc=2026-05-10T00:00:00Z` → `dueAt=2026-05-10T23:59:59Z`, `#inbox` matches list, `#unknown` returns `listId: null` and `unknownProjectToken: "#unknown"`, mixed tokens all parsed simultaneously, case-insensitive. | Pure function — mandatory tests |
| `lib/features/ithink/components/ithink-quick-add.tsx` | Modal dialog. Renders title `<input>` + ghost preview row showing parsed tokens. Submit on Enter. Shift+Enter adds and resets without closing (keep-adding mode). Passes `nowUtc={new Date()}` from client to parser — client supplies its own clock, which is local browser time converted to UTC via `Date.now()`. | TZ: using browser's `new Date()` on the client is the correct approach; the parser normalizes to UTC |
| `lib/features/ithink/components/ithink-fab.tsx` | `position: fixed`, bottom-right, `lg:hidden`, `aria-label="Add task"`. Opens quick-add modal. | AGENTS.md §15 — accessible buttons |
| Update `ithink-list-view.tsx` | Wire inline capture row to `parseIThinkDraft`. Ghost preview `<div>` below input shows parsed due + severity when tokens detected. Clear button appears when tokens active. | Phase 1 inline row becomes smarter; no structural change to Phase 1's shell layout |
| Update `create-ithink.ts` | Accept `severity`, `dueAt`, `listId` from parsed result in addition to `title` and `consequence`. | `insertOrgOneThing` already accepts all these: `onething.mutations.server.ts:111–128` |

### NL token specification

| Token | Produces | Failure mode |
|-------|----------|-------------|
| `p1` | `severity: "critical"` | — |
| `p2` | `severity: "high"` | — |
| `p3` | `severity: "medium"` | — |
| `p4` | `severity: "low"` | — |
| `today` | `dueAt`: `nowUtc` date at `23:59:59 UTC` | — |
| `tomorrow` | `dueAt`: `nowUtc + 1 day` at `23:59:59 UTC` | — |
| `next week` | `dueAt`: next Monday from `nowUtc` at `23:59:59 UTC` | — |
| `#<slug>` | `listId`: matched by `lists.find(l => l.slug === slug)?.id` | If no match: `listId: null, unknownProjectToken: "#<slug>"`. UI shows inline error "List '#<slug>' not found" — **does not silently fall back to inbox**. |
| `@<label>` | `labelTokens: string[]` | Stored for Phase 5 when labels exist. No error in Phase 2. |

All tokens case-insensitive. Multiple tokens in one title are all parsed simultaneously.
Tokens are stripped from `cleanTitle` before submit.

### Exit criteria

- [ ] `parseIThinkDraft("Fix invoice p1 today", [...], nowUtc)` returns `{ cleanTitle: "Fix invoice", severity: "critical", dueAt: <today 23:59 UTC> }`.
- [ ] `parseIThinkDraft("Fix invoice #unknown", [...], nowUtc)` returns `{ unknownProjectToken: "#unknown" }` and the UI shows an inline error, not a silent submit.
- [ ] FAB visible on a 375px-wide viewport, hidden on 1280px-wide viewport.
- [ ] `q` keyboard shortcut opens modal when no `<input>` or `<textarea>` is focused.
- [ ] Shift+Enter in modal adds task and resets input without closing the modal.
- [ ] `pnpm verify` passes.

---

## Phase 3 — Readable Detail

**Delivers:** Clicking a task opens a detail panel. Note is editable. Due date visible on list row. Resolve and complete work.

### Deliverables

| File | What it does | Evidence |
|------|-------------|----------|
| `lib/features/ithink/actions/update-ithink.ts` | `"use server"`. Calls `requireOrgSession()`. Reads `oneThingId`, `title`, `consequence`, `dueAt` from FormData. Validates: `title` with lenient schema, `consequence` as `z.string().max(10000)`. Calls `updateOneThingFields(oneThingId, patch)` (structural addition B). Audits `erp.ithink.consequence.update`. Calls `revalidateOrgIThinkDashboard()`. | `updateOneThingFields` must be added first (structural addition B). Max 10000 on consequence is a safe bound. |
| `lib/features/ithink/actions/resolve-ithink.ts` | `"use server"`. Thin wrapper: re-exports `resolveOrgOneThing` from `#features/onething` verbatim but calls `revalidateOrgIThinkDashboard()` after success instead of the OneThing revalidate. Audit string `erp.ithink.consequence.resolve` written by the caller in the action. | `resolve-org-onething.ts` already writes `erp.onething.consequence.resolve` via `buildCrudSapAuditAction` — iThink must write its own audit entry to avoid mixing audit namespaces |
| `lib/features/ithink/actions/complete-ithink.ts` | `"use server"`. Wraps `completeOrgOneThing` logic: `requireOrgSession` → `getOneThingScoped` → `updateOneThingState({state:"resolved"})` → audit `erp.ithink.consequence.complete` → `enqueueOneThingRecurrenceWorkflowRun` if recurrenceRule → `revalidateOrgIThinkDashboard()`. Does NOT call `completeOrgOneThing` directly because that function calls `revalidateOrgOneThingDashboard()`. | `actions/complete-org-onething.ts:50` — existing action revalidates `/onething`; can't simply wrap it |
| `lib/features/ithink/actions/snooze-ithink.ts` | `"use server"`. Same pattern: session → fetch row → `updateOneThingState({state:"blocked", snoozeUntil: new Date(Date.now() + 3_600_000)})` → audit `erp.ithink.consequence.snooze` → revalidate. | Mirrors `actions/snooze-org-onething.ts` |
| `lib/features/ithink/actions/deprecate-ithink.ts` | `"use server"`. Session → fetch → `updateOneThingState({state:"deprecated"})` → audit `erp.ithink.consequence.deprecate` → revalidate. | `VALID_TRANSITIONS` in `onething-onething-state.server.ts:11–23` confirms all active states can transition to `deprecated` |
| `lib/features/ithink/actions/reopen-ithink.ts` | `"use server"`. Session → fetch → `updateOneThingState({state:"detected"})` → audit `erp.ithink.consequence.reopen` → revalidate. | `VALID_TRANSITIONS` shows `resolved` → `[]` (terminal). Reopen is only valid from `deprecated`. Validate before calling. |
| `lib/features/ithink/actions/delete-ithink.ts` | `"use server"`. Session → `deleteOneThingById(id)` → audit `erp.ithink.consequence.delete` → revalidate. | `onething.mutations.server.ts:218` |
| `lib/features/ithink/components/ithink-detail-panel.tsx` | `"use client"`. Props: `row: OneThingRow`. Renders: title `<input>` (editable, saves on blur via `updateIThinkAction`), consequence `<textarea>` (always visible, always editable, saves on blur), due date display chip + `<input type="date">` on click, severity badge, state badge, toolbar (`<IThinkDetailToolbar>`), 7W1H audit footer from `row.audit7w1h`, Lynx grounding registration. Three empty `<section>` elements with `data-slot` attributes reserved for Phase 4. | Detail panel has Phase 4 slots already. Phase 4 fills them; Phase 3 does not move them. |
| `lib/features/ithink/components/ithink-detail-toolbar.tsx` | Complete / Resolve / Snooze / Deprecate / Reopen / Delete buttons. Complete: calls `completeIThinkAction` directly. Resolve: opens a dialog that accepts `resolutionNote` + optional proof, calls `resolveIThinkAction`. Reopen disabled when `row.state !== "deprecated"`. | `resolveOrgOneThing` requires `resolutionNote` and `resolutionProofJson` in FormData (`resolve-org-onething.ts:39–43`) |
| Update `ithink-task-row.tsx` | Add `<input type="checkbox">` left of title. Checked when `row.state === "resolved"`. `onChange` calls `completeIThinkAction(row.id)`. Add due date `<time>` chip right of title when `row.dueAt !== null`. Add severity dot left of checkbox. | `row.dueAt` is in the SELECT from Phase 1's `ithink.queries.server.ts` |
| Update `ithink-shell.tsx` | Pass selected `OneThingRow` to `<IThinkDetailPanel>`. | Phase 1 shell already has the selection state |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/[id]/page.tsx` | `async` Server Component. `const { locale, orgSlug, id } = await params`. Calls `getIThinkById(id, orgId)`. **Calls `notFound()` immediately if row is null — before any `<Suspense>` boundary — to guarantee a real HTTP 404 status before streaming starts.** Renders `<IThinkShell>` with pre-selected task. This route is new — no OneThing equivalent exists. | Next.js docs — "Triggering 404 Status Before Streaming in Next.js"; confirmed by glob: OneThing has no `[id]` page |

### Why `complete` and `resolve` are separate verbs

`completeOrgOneThing` (`complete-org-onething.ts:12`) sets `state="resolved"` with no DoD check and is intended for low/medium severity checkbox-style completion. `resolveOrgOneThing` (`resolve-org-onething.ts:36`) enforces DoD for `high`/`critical` severity and writes a structured 7W1H event. Both set state to `"resolved"` in the DB. The distinction is **audit quality and evidence requirements**, not the final state. iThink preserves this distinction: checkbox → `completeIThinkAction`, Resolve button → `resolveIThinkAction` with dialog.

### Exit criteria

- [ ] Clicking a task row opens its detail panel.
- [ ] `<textarea>` for consequence/note is visible immediately on panel open — no "Edit" button required.
- [ ] Blurring the textarea after change persists the text (verified by hard-refresh showing updated value).
- [ ] `dueAt` chip appears on list row when set.
- [ ] Checkbox on list row calls `completeIThinkAction`, row disappears from inbox list.
- [ ] Resolve button opens dialog; submitting without `resolutionNote` on a `critical` severity task returns `code: "dod_failed"` and the dialog stays open.
- [ ] Navigating directly to `/dashboard/ithink/[id]` loads the detail view.
- [ ] `pnpm verify` passes.

---

## Phase 4 — Context Surfaces

**Delivers:** Comments, attachments, and sub-tasks are visible. The write-only backend becomes readable.

Phase 3 reserved three `<section data-slot="...">` elements in `ithink-detail-panel.tsx`. Phase 4 fills them. The panel layout does not change.

### Deliverables

| File | What it does | Evidence |
|------|-------------|----------|
| `lib/features/ithink/data/ithink-comments.queries.server.ts` | `listIThinkComments(oneThingId: string)` — `SELECT id, authorUserId, body, createdAt FROM onething_comment WHERE oneThingId = ? ORDER BY createdAt ASC`. | `lib/db/schema.ts:356–375` — schema confirmed |
| `lib/features/ithink/data/ithink-attachments.queries.server.ts` | `listIThinkAttachments(oneThingId: string)` — `SELECT id, url, mimeType, sizeBytes, createdAt FROM onething_attachment WHERE oneThingId = ? ORDER BY createdAt ASC`. | `lib/db/schema.ts:338–354` — schema confirmed |
| `lib/features/ithink/data/ithink-subtasks.queries.server.ts` | `listIThinkSubtasks(parentId: string, organizationId: string)` — `SELECT ... FROM onething WHERE parentOneThingId = ? AND organizationId = ?`. Uses same `ITHINK_ACTIVE_STATES` filter. | `lib/db/schema.ts:299` — `parentOneThingId` exists; `lib/features/onething/data/onething.queries.server.ts:123–150` confirms it was never selected before |
| `lib/features/ithink/actions/add-comment.ts` | `"use server"`. Session → validate `body: z.string().trim().min(1).max(5000)` → `insertOneThingComment({oneThingId, authorUserId, body})` → audit `erp.ithink.comment.create` → revalidate. | `onething.mutations.server.ts:222–232` |
| `lib/features/ithink/actions/add-attachment.ts` | `"use server"`. Session → `insertOneThingAttachment({oneThingId, url, contentSha256, mimeType, sizeBytes})` → audit `erp.ithink.attachment.create` → revalidate. Upload to Vercel Blob happens in the client before this action is called (same pattern as `app/api/upload/blob`). | `onething.mutations.server.ts:234–248` |
| `lib/features/ithink/actions/create-subtask.ts` | `"use server"`. Session → lenient schema → `insertOrgOneThing({..., parentOneThingId: parentId})` → audit `erp.ithink.consequence.create` → revalidate. | `lib/db/schema.ts:299` — `parentOneThingId` column exists; `onething.mutations.server.ts:111` — `insertOrgOneThing` does not set it yet because the column exists on the table with no NOT NULL constraint |
| `lib/features/ithink/components/ithink-comments-section.tsx` | `async` Server Component. Accepts `oneThingId: string`. Calls `listIThinkComments(oneThingId)`. Renders comment thread + `<textarea>` + submit button. This is a Server Component so the query runs server-side and streams in. | AGENTS.md Tier B — enrichment must use Suspense/Server Component slots, not block authority |
| `lib/features/ithink/components/ithink-attachments-section.tsx` | `async` Server Component. Accepts `oneThingId: string`. Calls `listIThinkAttachments(oneThingId)`. Renders attachment list + upload button. | Same Tier B pattern |
| `lib/features/ithink/components/ithink-subtasks-section.tsx` | `async` Server Component. Accepts `oneThingId: string`, `organizationId: string`. Calls `listIThinkSubtasks(oneThingId, organizationId)`. Renders sub-task list + inline capture row. | Same Tier B pattern |
| Update `ithink-detail-panel.tsx` | Fill the Phase 3 reserved slots with `<Suspense>` boundaries, each with a matching skeleton fallback: `<Suspense fallback={<SubtasksSkeleton />}><IThinkSubtasksSection oneThingId={id} /></Suspense>`. Same for comments and attachments. The panel itself does not `await` these — they stream independently after the panel shell renders. | Next.js docs — Suspense boundary = where static shell ends and streaming begins; AGENTS.md Tier B must use Suspense + skeleton fallbacks |

### Exit criteria

- [ ] After `addOrgOneThingComment` action, the comment appears in the thread without hard refresh (optimistic update or `revalidatePath`).
- [ ] After attachment upload + `addOrgOneThingAttachment` action, the file appears in the list.
- [ ] Sub-task capture row creates a child task with `parentOneThingId` set (verify in DB: `SELECT parentOneThingId FROM onething WHERE id = $new_id`).
- [ ] Sub-task checkbox independently resolves that child task.
- [ ] Empty state ("No comments yet", "No attachments") renders correctly for a brand-new task.
- [ ] `pnpm verify` passes.

---

## Phase 5 — Navigation Projections

**Delivers:** Sidebar is a real view router. Inbox, Today, Scheduled, Projects all navigate correctly.

### Deliverables

| File | What it does | Evidence |
|------|-------------|----------|
| `lib/features/ithink/data/ithink.queries.server.ts` additions | `listIThinkForToday(orgId)` — `dueAt IS NOT NULL AND dueAt <= :endOfToday AND state IN (ITHINK_ACTIVE_STATES)`. `listIThinkForScheduled(orgId)` — `dueAt > :endOfToday AND state IN (ITHINK_ACTIVE_STATES)`. `:endOfToday` must be computed UTC-aligned: `new Date()` set to `23:59:59.999` in UTC. Both cross-list (no `listId` filter). | `lib/db/schema.ts:296` — `dueAt` column indexed at `onething_due_at_idx`; `lib/features/onething/data/onething.queries.server.ts:316–321` — active states used in overdue query |
| `lib/features/ithink/components/ithink-sidebar.tsx` | `"use client"`. Fixed navigation nodes: Inbox, Today, Scheduled with item counts passed as props. Collapsible Projects section from `listIThinkListsForOrg` result. `+ New list` inline button calls `createIThinkListAction`. Active route highlighted via `usePathname()` from `#i18n/navigation`. | `lib/features/onething/data/onething.queries.server.ts:152–172` — `listOneThingListsForOrg` pattern to reuse |
| `lib/features/ithink/actions/create-ithink-list.ts` | `"use server"`. Session → `z.string().trim().min(1).max(100)` for name → derive slug from name → `db.insert(oneThingList)` → audit `erp.ithink.list.create` → revalidate. Slug derivation must check uniqueness within org. | `onething.mutations.server.ts:43–75` — `ensureDefaultOneThingListForOrg` shows the `onConflictDoNothing` pattern for list insert |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/today/page.tsx` | `async` Server Component. `const { orgSlug } = await params`. Gets session. Parallelizes: `const [rows, lists] = await Promise.all([listIThinkForToday(orgId), listIThinkListsForOrg(orgId)])`. Renders `<IThinkShell activeView="today">`. | Next.js docs — `Promise.all` for parallel independent fetches |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/scheduled/page.tsx` | `async` Server Component. Same pattern — `Promise.all([listIThinkForScheduled(orgId), listIThinkListsForOrg(orgId)])`. | Same |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/p/[listId]/page.tsx` | `async` Server Component. `const { orgSlug, listId } = await params`. Gets session. Calls `getOrgOneThingListById(orgId, listId)`. **Calls `notFound()` immediately if list is null — before `Promise.all` or any `<Suspense>` — to send a real HTTP 404 before streaming starts.** Then parallelizes: `const [rows, lists] = await Promise.all([listIThinkForList(listId, orgId), listIThinkListsForOrg(orgId)])`. | Next.js docs — "Triggering 404 Status Before Streaming"; AGENTS.md §5 — `listId` validated against org from `requireOrgSession` |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/today/loading.tsx` | Skeleton matching list shape for Today view. | Same `loading.tsx` doctrine as Phase 1 |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/scheduled/loading.tsx` | Skeleton matching list shape for Scheduled view. | Same |
| `app/[locale]/o/[orgSlug]/dashboard/ithink/p/[listId]/loading.tsx` | Skeleton matching list shape for Project view. | Same |
| Update `ithink-shell.tsx` | Replace sidebar stub with `<IThinkSidebar>`. | Phase 1 shell left sidebar as `<aside>` stub |

### View filter specification

| View      | Query filter |
|-----------|-------------|
| Inbox     | `listId = defaultInboxListId AND state IN ITHINK_ACTIVE_STATES` |
| Today     | `dueAt <= endOfTodayUTC AND state IN ITHINK_ACTIVE_STATES` (cross-list) |
| Scheduled | `dueAt > endOfTodayUTC AND state IN ITHINK_ACTIVE_STATES` (cross-list) |
| Project   | `listId = selectedListId AND state IN ITHINK_ACTIVE_STATES` |

`ITHINK_ACTIVE_STATES = ["detected", "owned", "blocked", "resolving"]` — matches existing active-state queries in OneThing. States `ready_to_release` and `released` are intentionally excluded from all views as they are terminal-in-progress (not open for operator action).

### Exit criteria

- [ ] Sidebar renders Inbox, Today, Scheduled nodes with correct item counts.
- [ ] Projects section renders all lists returned by `listOneThingListsForOrg`.
- [ ] `+ New list` creates a list and it appears in the sidebar on the same render cycle.
- [ ] Clicking Today shows only items with `dueAt` today.
- [ ] Clicking Scheduled shows only items with `dueAt` in the future.
- [ ] Clicking a project list shows only items belonging to that list.
- [ ] `usePathname()` highlights the active sidebar node correctly.
- [ ] `pnpm verify` passes.

---

## Phase 6 — Cutover

**Delivers:** OneThing org routes redirect to iThink. Dashboard nav swapped. Cron wired.

**Personal account surface is out of scope.** `account/onething` routes are left as-is in v1. They redirect in a future v2 phase when `account/ithink` is built. Redirecting before the destination exists causes 404s.

### Deliverables

| File | What it does | Evidence |
|------|-------------|----------|
| `app/[locale]/o/[orgSlug]/dashboard/onething/page.tsx` | Replace content with an `async` Server Component that `await`s params: `const { locale, orgSlug } = await params`. Calls `redirect(toLocalePath(locale, \`/o/${orgSlug}/dashboard/ithink\`))`. No `revalidatePath` needed here — this page performs no mutation, only a redirect. | Next.js 16 — `params` is a `Promise`; `lib/i18n/locales.shared.ts` — `toLocalePath` is the correct server redirect helper; `i18n-directory.mdc` — never emit bare `/o` |
| `lib/dashboard-module-paths.ts` | Remove `"onething"` from `DASHBOARD_NAV_MODULES`. Add `"ithink"` (done in structural addition A). The nav renders from this array. | `lib/dashboard-module-paths.ts:66–77` |
| `vercel.json` | Add cron: `{ "path": "/api/cron/onething-digest", "schedule": "0 8 * * *" }`. Note: `0 8 * * *` = 08:00 UTC = 04:00 ET / 01:00 PT / 16:00 SGT. This is intentionally early UTC so Asian operators get mid-morning and US operators get pre-shift. | Cron endpoint confirmed at `app/api/cron/onething-digest` (not yet in `vercel.json`) |
| `lib/features/ithink/client.ts` | Narrow barrel: exports `createIThinkAction`, `completeIThinkAction`, `addIThinkCommentAction`, `addIThinkAttachmentAction`. These are the only Server Actions that client islands call directly. | AGENTS.md §6 — client barrel is narrow types + Server Actions only |
| `lib/features/ithink/server.ts` | Barrel: exports `listIThinkForList`, `listIThinkForToday`, `listIThinkForScheduled`, `listIThinkListsForOrg`, `getIThinkById`. | AGENTS.md §6 |

### What is NOT done in Phase 6

- `lib/features/onething/components/**` are NOT marked `@deprecated` with comments. They are live files serving the redirected page (which now immediately redirects). Commenting live files is a backwards-compat hack. They will be deleted in v2 when the OneThing data layer is fully replaced or consolidated.
- `lib/features/onething/actions/**` and `lib/features/onething/data/**` are NOT deprecated. iThink still depends on them. Marking them deprecated while they have live callers is dishonest.

### Exit criteria

- [ ] `GET /[locale]/o/[slug]/dashboard/onething` returns a redirect (302 or 307) to `/[locale]/o/[slug]/dashboard/ithink`.
- [ ] Dashboard sidebar does not show an OneThing nav entry.
- [ ] `vercel.json` contains the `onething-digest` cron entry.
- [ ] `account/onething` routes still work (not touched, intentional).
- [ ] `pnpm verify` passes.

---

## Phase summary

| Phase | Theme | Blocked on | Done when |
|-------|-------|-----------|-----------|
| Structural A+B | Pre-work | Nothing | `dashboard-module-paths.ts` updated, `updateOneThingFields` added |
| 1 | Capture & Shell | Structural A+B | Task created and visible from always-on input |
| 2 | Quick Capture | Phase 1 | Token parsing + FAB + keep-adding working |
| 3 | Readable Detail | Phase 1 | Note editable, resolve gated by DoD, due chip on rows |
| 4 | Context Surfaces | Phase 3 (slots) | Comments, attachments, sub-tasks all visible |
| 5 | Navigation Projections | Phase 1 (queries) | All sidebar nodes navigate and filter correctly |
| 6 | Cutover | Phases 1–5 stable | OneThing org route redirects, nav swapped, cron live |

Phases 2 and 5 can build in parallel after Phase 1 ships.
Phases 3 and 5 can build in parallel — they share no components.
Phase 4 requires Phase 3's `data-slot` placeholders to already exist.
