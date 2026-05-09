# ADR-0001 — Afenda OneThing: the operational focus layer

| Field             | Value                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**        | Accepted (UI surface partially superseded — see banner below)                                                                                                               |
| **Date**          | 2026-05-09                                                                                                                                                                  |
| **Supersedes**    | The todo product model — OneThing replaces task-first todos as Afenda's operational focus surface                                                                           |
| **Companion**     | [ADR-0002 — OneThing morph: rejected scope (the negative space)](./0002-onething-morph-rejections.md) — records what the morph intentionally did not build                  |
| **Authoritative** | [`.cursor/rules/onething-directory.mdc`](../../.cursor/rules/onething-directory.mdc) — tracks shipped behavior; supersedes this ADR's UI sections when the two disagree     |
| **Affects**       | `lib/features/onething/`, legacy `lib/features/todos/` migration, `lib/erp/`, dashboard OneThing routes, Lynx                                                               |

---

> ## Status banner (read this before §9 / §12)
>
> The **product model, temporal-spine framing, ranking model, state language, and product positioning** in this ADR (sections §1–§8, §10, §11, §13–§16) remain authoritative — the morph did not change *what* OneThing is, only *how* it presents itself.
>
> The **UI architecture (§9)** and **suggested file names under `components/` (§12)** describe an earlier five-part surface (quiet ranked queue + canvas + truth rail + action key + Lynx drawer) and the original file slugs (`onething-canvas.server.tsx`, `onething-truth-rail.server.tsx`, `onething-action-key.client.tsx`, `onething-lynx-drawer.client.tsx`). That surface was **morphed in May 2026** into the two-pane operational document model: list pane + editorial detail pane + five-control toolbar + summary-first audit footer, with no truth-rail, no Lynx drawer inside OneThing, no action-key.
>
> Both descriptions remain in this ADR as historical context. For the **current shipped surface contract**, read [`.cursor/rules/onething-directory.mdc`](../../.cursor/rules/onething-directory.mdc). For the **rationale of what the morph intentionally did not build**, read [ADR-0002](./0002-onething-morph-rejections.md).
>
> If you are evaluating whether a new UI proposal is in scope: the rule and ADR-0002 govern. This ADR's §9 / §12 are not a backlog.

---

## 0. Respectful design influence

OneThing is **not** an attempt to claim, copy, or imitate Steve Jobs.

It respectfully borrows from a design philosophy often associated with his work:

```txt
simplify until the essential decision becomes obvious
```

For Afenda, that philosophy becomes:

```txt
Do not show the operator more work.
Show the operator the one consequence that must be made safe.
```

OneThing is not "Apple-style UI."

It is **Afenda's own operational focus architecture**, guided by:

- one dominant focus
- invisible complexity
- calm interaction
- consequence before feature
- trust through proof
- human confidence over system exposure

---

## 1. Core definition

**OneThing** is Afenda's operational focus surface.

It identifies the single consequence that matters most now, explains why it exists, shows what must be resolved, and prepares the next safe handoff.

```txt
OneThing = consequence + owner + evidence + time + next-safe-action
```

Its purpose:

```txt
Make the next safe decision obvious.
```

Not:

```txt
Manage tasks.
```

---

## 2. Product belief

Traditional productivity tools ask:

```txt
What tasks are open?
```

Afenda asks:

```txt
What consequence is unsafe?
```

Traditional ERP asks:

```txt
Which record do you want to edit?
```

Afenda asks:

```txt
What must become true before the business can safely continue?
```

That is the product shift.

---

## 3. Cognitive operating philosophy

This layer governs UI, UX, data, AI, ranking, audit, and workflow.

### 3.1 One dominant focus

The user should never enter OneThing and ask:

```txt
Where should I look?
```

The interface must establish:

- one primary consequence
- one primary owner
- one primary risk
- one primary action

Everything else supports that decision.

### 3.2 Calm over density

Enterprise software often confuses density with power.

OneThing rejects that.

Power comes from:

- clear hierarchy
- restrained surfaces
- progressive disclosure
- fewer competing actions
- meaningful silence
- strong default ranking

The operator should feel:

```txt
I know what matters.
```

### 3.3 Complexity absorbed by the system

The user should not feel:

- joins
- modules
- workflow engines
- AI pipelines
- audit tables
- policy graphs
- ranking formulas

Those are platform responsibilities.

The user experiences:

```txt
Here is the issue.
Here is why.
Here is what happens next.
Here is the safe action.
```

### 3.4 Consequence before process

OneThing does not start from:

```txt
Process step 4 of 9
```

It starts from:

```txt
This approval is unsafe because supplier identity conflicts with Accounting.
```

Process is still there, but consequence leads.

### 3.5 Resolution over completion

A checkbox says:

```txt
I did something.
```

OneThing asks:

```txt
Is the business safe now?
```

So "done" means:

- evidence exists
- risk is cleared
- audit is recorded
- downstream party is released
- future confusion is reduced

### 3.6 Trust through proof

Lynx and prediction should never feel like magic.

Every recommendation must be grounded in:

- source record
- evidence
- audit trail
- linked object
- policy
- historical pattern

The user should trust because the proof is visible.

---

## 4. Temporal spine

Every OneThing has three time layers:

```txt
Past -> Present -> Future
```

The internal architecture uses **Past / Present / Future** because it describes the time model precisely.

The product UI should express the same model as **Past / Now / Next** because that language is more operational:

```txt
Past = why this exists
Now  = what must be resolved
Next = who or what becomes safe or blocked
```

This layer is the **OneThing Temporal Spine**.

It makes OneThing feel less like a task and more like an operational continuity object.

### Past

The origin.

Answers:

```txt
How did we get here?
```

Contains:

- trigger
- source object
- evidence
- prior decision
- policy reference
- audit history

### Present / Now

The active consequence.

Answers:

```txt
What must I resolve now?
```

Contains:

- owner
- blocker
- risk
- consequence statement
- safe action
- SLA window

### Future / Next

The downstream release or breakage.

Answers:

```txt
Who or what is affected next?
```

Contains:

- next owner
- affected workflow
- predicted failure
- release condition
- handoff packet

### 4.1 Temporal spine and CRUD-SAP

CRUD-SAP maps naturally onto the temporal spine:

| Time layer | UI language | Operating grammar          |
| ---------- | ----------- | -------------------------- |
| Past       | Past        | Search + Audit             |
| Present    | Now         | Resolve + Update           |
| Future     | Next        | Predict + Create handoff   |

This mapping is internal architecture, not a UI slogan.

The operator should experience it as:

```txt
Past
The evidence that created this consequence.

Now
The decision that restores safety.

Next
The party or workflow released by your action.
```

### 4.2 Temporal spine and 7W1H

The 7W1H audit model should also align to time:

| Time layer | 7W1H focus                                                         |
| ---------- | ------------------------------------------------------------------ |
| Past       | Who, What, When, Where, Why, Which, How                            |
| Present    | Who owns it now, What is unsafe now, Why it matters now            |
| Future     | Whom it affects next, Which object moves next, How risk propagates |

The UI should prefer narrative continuity over rigid dimensional display.

---

## 5. Operating grammar: CRUD-SAP

CRUD is too weak for Afenda because CRUD manages records.

OneThing manages consequences.

Afenda's internal operating grammar is:

```txt
CRUD-SAP
Create
Resolve
Update
Deprecate
Search
Audit
Predict
```

CRUD-SAP is mostly an internal grammar, not a UI slogan.

Users may see friendly actions like:

- Resolve consequence
- Show proof
- Explain history
- Preview impact
- Create handoff
- Update owner/blocker
- Retire safely

Internally, those map to CRUD-SAP.

### 5.1 Create

Create a consequence object with context.

Not:

```txt
Create task
```

But:

```txt
Create operational object
```

A created OneThing should know:

- source object
- owner
- linked party
- initial evidence
- timing condition
- first risk state

### 5.2 Resolve

Resolve is the primary action.

```txt
Resolve = close the consequence safely
```

Resolution requires:

- decision
- proof
- audit
- safe downstream state
- next owner released or notified

### 5.3 Update

Update changes the operating state.

Examples:

- owner changed
- blocker changed
- evidence added
- due window changed
- risk severity changed

Every meaningful update requires a reason.

### 5.4 Deprecate

Deprecate retires without erasing memory.

Use when a OneThing is:

- duplicate
- superseded
- no longer relevant
- merged into another object
- invalidated by a policy change

Deprecation is not deletion.

It preserves operational memory.

### 5.5 Search

Search finds the truth chain.

Search answers:

```txt
Where is the proof?
```

It spans:

- source records
- policies
- documents
- parties
- historical cases
- contradictions
- linked workflows

### 5.6 Audit

Audit explains what happened.

Audit answers:

```txt
Why can we trust this?
```

It should be readable, not raw logs.

### 5.7 Predict

Predict shows what happens next.

Predict answers:

```txt
What breaks if this remains unresolved?
```

It covers:

- blocked party
- downstream workflow
- financial risk
- compliance risk
- SLA exposure
- safest next action

---

## 6. 7W1H audit shape

OneThing audit uses **7W1H** as the readable audit model.

| Dimension | Meaning                          |
| --------- | -------------------------------- |
| Who       | Who acted                        |
| What      | What changed                     |
| When      | When it happened                 |
| Where     | Which module / workflow / entity |
| Why       | Operational reason               |
| Which     | Which object / record / policy   |
| Whom      | Who is affected                  |
| How       | Mechanism / system path          |

The UI should not always show a rigid table.

The preferred UI output is narrative:

```txt
Rina submitted the supplier packet 52 minutes ago during PO-0488 approval.
Lynx detected a VAT conflict against the canonical Acme record.
Jordan must resolve the identity before Mei can approve the CFO route.
```

The table exists for inspection.

The story exists for speed.

---

## 7. OneThing domain model

```ts
type OneThing = {
  id: string

  title: string
  consequence: string
  state: OneThingState
  severity: "low" | "medium" | "high" | "critical"

  ownerId: string
  currentActorId: string | null
  nextActorId: string | null

  sourceType: string
  sourceId: string

  temporalPast: OneThingPast | null
  temporalNow: OneThingNow
  temporalNext: OneThingNext | null

  searchRefs: TruthReference[]
  auditTrail: AuditEvent7W1H[]
  predictions: Prediction[]

  dueAt: Date | null
  resolvedAt: Date | null
  deprecatedAt: Date | null

  createdAt: Date
  updatedAt: Date
}
```

---

## 8. State model

Use operational states, not generic task status.

```txt
Detected
Owned
Blocked
Resolving
ReadyToRelease
Released
Resolved
Deprecated
```

| State          | Meaning                     |
| -------------- | --------------------------- |
| Detected       | Afenda found a consequence  |
| Owned          | Accountable owner assigned  |
| Blocked        | Cannot safely proceed       |
| Resolving      | Active resolution underway  |
| ReadyToRelease | Safe action prepared        |
| Released       | Passed to next owner/system |
| Resolved       | Consequence closed safely   |
| Deprecated     | Retired but remembered      |

---

## 9. UI architecture

> **Superseded.** The five-part surface described below (quiet ranked queue + OneThing canvas + truth rail + action key + Lynx drawer) was the original 2026-05-09 model. It was replaced in the same month by the two-pane operational-document morph; the canvas, truth rail, and Lynx drawer no longer exist as separate UI parts. The action-key table at §9.4 still documents the *internal* CRUD-SAP grammar (which remains authoritative), but those labels are no longer surfaced as visible toolbar copy. Read [`.cursor/rules/onething-directory.mdc`](../../.cursor/rules/onething-directory.mdc) for the current row anatomy, toolbar contract, audit footer, and keyboard map.

The product surface has five parts.

### 9.1 Quiet ranked queue

Purpose:

```txt
Show what matters without creating noise.
```

Contains:

- active OneThing
- reason it is ranked first
- owner
- time pressure
- severity

The queue is not the product.

The queue is a selector.

### 9.2 OneThing canvas

Purpose:

```txt
Make the next safe decision obvious.
```

Contains:

- Past / Now / Next
- consequence statement
- owner
- blocked party
- due window
- linked object
- primary resolve action

This is the product center.

### 9.3 Truth rail

Purpose:

```txt
Make proof available without overwhelming the decision.
```

Contains:

- audit narrative
- 7W1H details
- linked evidence
- predicted breakage
- next owner

The truth rail should support trust, not compete for attention.

### 9.4 Action key

Visible user-facing actions:

| UI label             | Internal grammar |
| -------------------- | ---------------- |
| Resolve consequence  | Resolve          |
| Show proof           | Search           |
| Explain history      | Audit            |
| Preview impact       | Predict          |
| Create handoff       | Create           |
| Update owner/blocker | Update           |
| Retire safely        | Deprecate        |

### 9.5 Lynx drawer

Purpose:

```txt
Grounded reasoning, not generic chat.
```

Lynx should:

- summarize why this matters
- explain proof
- compare past cases
- predict downstream impact
- draft handoff
- recommend next safe action

Lynx should not dominate the screen.

It should be available when the operator needs confidence.

---

## 10. Ranking model

OneThing ranking combines:

```txt
urgency + consequence + ownership + evidence confidence + downstream blockage
```

Possible scoring inputs:

- due window
- number of blocked downstream objects
- severity
- financial impact
- compliance impact
- customer impact
- owner availability
- evidence confidence
- prediction confidence
- stale time

The UI should explain ranking in plain language:

```txt
Shown first because it blocks 3 approvals and risks period close.
```

---

## 11. Definition of Done

A OneThing is resolved only when:

```txt
consequence resolved + proof attached + next state safe
```

DoD:

- consequence closed
- decision recorded
- evidence attached
- 7W1H audit generated
- downstream system safe
- next owner released or notified
- prediction cleared or accepted
- future memory preserved

---

## 12. Implementation architecture

> **File names superseded.** The directory boundary `lib/features/onething/` is still authoritative, but the suggested file slugs below (`onething-canvas.server.tsx`, `onething-truth-rail.server.tsx`, `onething-action-key.client.tsx`, `onething-lynx-drawer.client.tsx`, etc.) describe the original five-part surface and are not what shipped. Read [`.cursor/rules/onething-directory.mdc` → "Component file layout"](../../.cursor/rules/onething-directory.mdc) for the actual files. The repo-shape constraint (`actions / data / components / schemas / index.ts / client.ts / server.ts`) is now governed by AGENTS.md §6 and may be tighter than this section's `audit / domain / predictions / ranking` shape.

OneThing replaces the todo product/domain surface.

In this repository the canonical feature boundary is:

```txt
lib/features/onething/
  actions/
  audit/
  components/
  data/
  domain/
  predictions/
  ranking/
  schemas/
```

Suggested files:

```txt
onething.domain.shared.ts
onething.schemas.shared.ts
onething.repository.server.ts
onething.queries.server.ts
onething.actions.server.ts
onething.audit.server.ts
onething.prediction.server.ts
onething-ranking.server.ts
```

UI:

```txt
components/
  onething-ranked-queue.server.tsx
  onething-canvas.server.tsx
  onething-temporal-strip.server.tsx
  onething-truth-rail.server.tsx
  onething-action-key.client.tsx
  onething-lynx-drawer.client.tsx
```

Keep reads server-first.

Client components are only for:

- drawer open/close
- command palette
- optimistic action state
- keyboard shortcuts
- confirmation interactions

### 12.1 Legacy todos migration

Legacy todo code is not the future product model.

It may remain temporarily as:

- migration source
- compatibility adapter
- import path bridge
- data backfill helper
- personal low-risk fallback during transition

But the canonical product/domain language is OneThing.

New product work must not expand the old todo mental model.

---

## 13. Shared ERP primitives

Past / Present / Future, CRUD-SAP, and 7W1H are not only OneThing concepts.

The UI may continue to say Past / Now / Next, but the shared primitive should preserve the complete temporal model.

Promote them into shared ERP primitives:

```txt
lib/erp/
  temporal-spine.shared.ts
  crud-sap.shared.ts
  audit-7w1h.shared.ts
  audit-7w1h.server.ts
```

OneThing consumes them.

Other modules later consume them:

- contacts
- purchase
- sales
- inventory
- accounting
- governance
- knowledge
- Lynx

This keeps OneThing from becoming isolated.

---

## 14. Product positioning

Do not position OneThing as:

```txt
A better todo app.
```

Position it as:

```txt
Afenda's operational focus layer.
```

Better:

```txt
OneThing turns ERP work into one safe decision at a time.
```

Best:

```txt
OneThing is the consequence-resolution surface of Afenda.
```

---

## 15. Final architecture sentence

```txt
Afenda OneThing is a consequence-resolution surface inspired by the discipline of essential focus: it absorbs operational complexity, frames every issue through the Past / Present / Future temporal spine, expresses that spine as Past / Now / Next in the UI, grounds every action in proof, and guides the operator toward the next safe decision.
```

---

## 16. Decisions replaced by this revision

This revision intentionally replaces the earlier "evolve todos in place" interpretation.

The accepted direction is now:

```txt
OneThing replaces the todo product model.
```

The repo may still use migration adapters while implementation catches up, but architecture, copy, UI, ranking, and future feature work should target OneThing directly.
