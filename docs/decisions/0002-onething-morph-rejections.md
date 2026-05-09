# ADR-0002 — OneThing morph: rejected scope (the negative space)

| Field          | Value                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**     | Accepted                                                                                                                             |
| **Date**       | 2026-05-09                                                                                                                           |
| **Companion**  | [ADR-0001 — Afenda OneThing: the operational focus layer](./0001-onething.md)                                                        |
| **Affects**    | `lib/features/onething/components/**`, `.cursor/rules/onething-directory.mdc`, future PRs that propose extending the OneThing surface |

---

## 1. Why this ADR exists

The OneThing morph plan ([`onething_notes_morphology_cdef6cdc`](../../C:/Users/dlbja/.cursor/plans/onething_notes_morphology_cdef6cdc.plan.md)) called out a substantial set of UI / interaction features. After shipping a reduced subset and reviewing the surface in production shape, **a number of plan items were intentionally not built**.

Without this record, future agents and contributors will:

1. Re-litigate the same conversations every time the surface is revisited.
2. Accept "but the plan said X" as sufficient justification for rebuilding rejected work.
3. Drift the surface back toward productivity-app cognitive load.

This ADR records the rejections, the reasoning, and the doctrine line each rejection enforces.

## 2. The prime directive these rejections enforce

> **OneThing optimizes for operational inevitability, not feature discoverability.**

Every item below was a real plan call-out. Each was rejected because shipping it would improve the *visibility* of capability while reducing the *consequentiality* of the surface — exactly the inversion the prime directive forbids.

This ADR is not a "do later" backlog. Items here have been argued and refused. Reopening one requires:

1. Operator evidence (a recorded session, a complaint, a measurable hand-off failure) — not aesthetic preference.
2. A demonstration that the rejection's reasoning no longer holds.
3. An update to this ADR before the implementation PR.

## 3. Rejected items (the B-list)

### 3.1 Resizable, cookie-persisted list pane width

**Plan asked for:** a draggable handle on the list pane border with width persisted via cookie (the `app-sidebar` / `right-inspector` pattern).

**Rejected because:**

- 340px is the same width as iOS Mail's compact view and Things 3's sidebar. It is a *considered* default, not an arbitrary one.
- A drag handle is visible chrome that contradicts the doctrine's preference for considered geometry over user-managed interface negotiation.
- Cookie persistence implies the operator must remember "I made this narrower yesterday." That is a productivity-app burden.

**Reopen if:** an operator complains that their queue titles are being truncated at 340px on a real (not power-user) display.

### 3.2 Slot pattern: `<OneThingShell listPane={…} detailPane={…} />`

**Plan asked for:** the shell as a thin layout container that takes pre-rendered `listPane` and `detailPane` slots from the page.

**Rejected because:**

- Every shell-level hook (`useFocusNavigation`, `useResolveWithFocusHandoff`, the keyboard map) needs concurrent access to **both** `ranked` and `currentId`. Pushing those hooks up into the page would force the page to become `"use client"` — and the page is the RSC orchestrator (session, ranker, audit) that must stay server-side.
- The current direct-prop signature (`{ ranked, canvas, whyNow, … }`) lets RSC own data orchestration and the shell own interaction without duplicating either.
- The slot pattern's flexibility benefit is theoretical; we have one shell composition and we expect to keep having one.

**Reopen if:** we ever ship a second composition of OneThing (e.g. an inspector preview) that needs the same panes wired differently.

### 3.3 FLIP reconciliation pill ("Ranked into Later · Show")

**Plan asked for:** when a captured row gets ranked off-screen, animate it sliding to its destination (or crossfade and surface a "Ranked into Later · Show" pill that focuses the new id on click).

**Rejected because:**

- The captor — the operator who just hit ⌘Enter — does **not** want to track their submission's animation. They want to capture the next thing.
- Other operators who *would* benefit from watching the rank shift are not watching this captor's submission; they're scanning their own queue.
- The composer's `clear-on-success` already gives the captor the right "done, next" signal.
- FLIP is theater. It looks impressive in demos and contributes nothing to operational momentum.

**Reopen if:** we observe an operator in the wild trying to manually find their just-captured row and failing.

### 3.4 Optimistic list-row removal on resolve

**Plan asked for:** wrap the resolved row in `useOptimistic` so it disappears from the list before the server commits.

**Rejected because:**

- The resolve hand-off (`useResolveWithFocusHandoff`) **already** advances the detail pane optimistically via `router.replace`. The visible delay is only on the list-pane row, ~200–500ms.
- That short delay is honest — it tells the operator "the server actually committed your decision." In ERP, that subtle latency reinforces trust rather than damaging it.
- Optimistic removal requires rollback logic on failure. The complexity / felt-latency trade does not pay.

**Reopen if:** an operator session shows a measurable hesitation pattern caused by the row's lingering presence.

### 3.5 Snapshot-based new-activity dot

**Plan asked for:** an in-memory snapshot of `audit7w1h.length` and `predictions.length` at page mount. The dot lights when current counts exceed the snapshot.

**Rejected because:**

- The plan glossed over revalidation. When the RSC tree re-renders with a new event, the snapshot updates with it — the dot never lights for that event.
- The honest fix is a `lastViewedAt` per `(userId, oneThingId)` schema column, which the plan correctly called out as future schema work.
- The current "fresh < 1h" approximation is not lying about visit history. It is saying "this row has recent activity," which is true.

**Reopen when:** the `lastViewedAt` schema column ships. At that point, replace the heuristic with the truth.

### 3.6 Body type ramp at 17px

**Plan asked for:** detail-pane body paragraphs at 17px / 1.85 line-height.

**Rejected because:**

- The design system uses `text-base` (16px) as the canonical body token.
- 17px is a non-standard utility that would need a custom `tailwind.config.ts` token and would drift from the rest of the surface.
- The 1px difference is below cognitive threshold for body copy.

**Reopen if:** the design system itself adopts a 17px body token globally.

### 3.7 Mobile in-page slide-in animation

**Plan asked for:** below `lg`, the detail pane slides into view via `transition-transform`.

**Rejected because:**

- iOS Mail's compact view uses a hard pane swap on small screens. Hard swaps read as native, not as missing polish.
- Transform animations on lower-end devices stutter and feel laggy.
- The current `useIsMobile` swap is honest about the "now I'm reading the document" transition.

**Reopen if:** user testing shows operators losing context on the swap.

### 3.8 Composer one-line meta strip (severity / list / due-at / linkage / counterparty)

**Plan asked for:** a collapsible meta row under the composer textarea that lets the operator set severity, list, due date, and counterparty inline.

**Rejected because:**

- This **directly contradicts the morph doctrine**. Apple Notes captures with zero metadata. Things 3 captures with zero metadata. Both move organization to the detail surface, after capture.
- The plan accidentally smuggled productivity-app cognitive load into the composer (it shows up in its own "rules out" list as the kind of thing OneThing does not become).
- Triage belongs in the detail pane toolbar (`snooze`, `pin`, `more`), not in the capture moment.

**Reopen never.** This rejection is doctrinal.

### 3.9 Pinned-at-top with amber rail

**Plan asked for:** a pinned state that stays at the top of the list above the ranker, signaled by an amber rail.

**Rejected from this morph because:**

- Pinning is real Notes / Mail functionality and likely belongs in the product. But it requires:
  - A schema decision (per-actor pin? per-org pin? expires when?).
  - A new Server Action.
  - A UI wire-up that respects ranker authority while overriding ordering.
- The morph is a UI rebuild, not a feature add. Pinning is its own product spec.

**Reopen as:** a separate ADR + product spec when the schema model is decided. The toolbar slot is reserved by the rule contract.

### 3.10 Plan's exact spatial-rhythm ladder

**Plan asked for:** `mb-8 / mb-6 / mb-4 / mt-6` between detail-pane regions.

**Rejected because:**

- The shipped values (`gap-10 / gap-8`, ~40px / 32px) read as more editorial — closer to long-form publishing than card layout.
- The plan's tighter spec was a starting point. The looser shipped value is intentional and tested visually.

**Reopen if:** content density grows enough that the looser spacing feels wasteful.

### 3.11 Lynx ranker `titleQuality` advisory + soft inline rephrase prompt

**Plan asked for:** the Lynx ranker computes `titleQuality: "situation" | "event" | "noun"` and the detail pane shows a faint, dismissible "rephrase as a situation?" hint when the title is non-situational.

**Rejected from this pass because:**

- The strict `assertOneThingTitleIsSituation` Zod refine on the create path catches the worst titles at capture time.
- Existing data (and the lenient update path) can carry non-situational titles, but those titles are visible in the list pane — operators who care will fix them.
- The inline rephrase prompt is itself a hint chip, which sits at the borderline of the doctrine's "no tutorial chrome" rule.

**Reopen if:** we observe legacy / casually-edited titles producing list pane rows operators can't parse.

### 3.12 "Pin draft at #1 during pending state"

**Plan asked for:** while the create Server Action is in flight, render the draft as a pinned ghost row at the top of the list.

**Rejected because:**

- The action commits in 100–300ms typically.
- The composer textarea already shows the operator's words during that flight.
- Adding a duplicate row at #1 for sub-300ms is visual noise without informational gain.

**Reopen if:** the create action's typical latency rises above ~500ms.

## 4. Items that were shipped

For completeness, the morph plan items that *were* shipped against this same prime directive (no behavioral compromise):

- Two-pane shell (fixed-width list pane).
- Single-line list rows with title + ambient time + activity dot, no chrome.
- Editorial detail pane with `clamp()` headline, byline, prose body, inline `<sup>` predictions.
- Five-control toolbar with folded resolve / deprecate / more.
- Implicit-save composer with `localStorage` drafts and multi-tab sync.
- History-stack discipline (`useFocusNavigation`).
- Resolve-with-focus-handoff (preserves operational momentum).
- Strict `assertOneThingTitleIsSituation` on the create path.
- Title-as-situation contract + row anatomy contract + tutorial chrome ban encoded in [`.cursor/rules/onething-directory.mdc`](../../.cursor/rules/onething-directory.mdc).
- Continuity-thread audit footer.
- Distributed keyboard ownership (J / K / N / R / Esc / ⌘Enter).
- Sign-out cleanup of composer drafts and viewed-id LRU.
- Playwright smoke coverage of keyboard nav, composer submit, and resolve hand-off.

## 5. Reading order

For new contributors:

1. Read [ADR-0001](./0001-onething.md) for the product model.
2. Read this ADR (0002) for the negative space — what the surface deliberately is not.
3. Read [`.cursor/rules/onething-directory.mdc`](../../.cursor/rules/onething-directory.mdc) for the enforced contract.

If you find yourself proposing one of the items in §3, this ADR is the place to argue why it should now ship — or to internalize why it should stay rejected.
