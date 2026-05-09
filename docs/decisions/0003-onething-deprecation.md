# ADR-0003 — OneThing surface deprecation

| Field          | Value |
| -------------- | ----- |
| **Status**     | Accepted |
| **Date**       | 2026-05-10 |
| **Companion**  | [ADR-0004 — iThink](./0004-ithink.md) |

---

## 1. Decision

The OneThing **UI surface** is deprecated.

The OneThing **domain model, DB schema, Server Actions, and business logic** are preserved and reused by iThink.

---

## 2. Reason

The OneThing UI surface failed to make its own backend reachable:

- Operator cannot add a note (consequence textarea is hidden behind a transparent, border-less invisible composer).
- `dueAt`, `assigneeUserId`, `recurrenceRule` are stored but never displayed anywhere.
- Comments and attachments can be written but never rendered.
- `parentOneThingId` (sub-tasks) exists on the schema but is not SELECTed or shown.
- The capture row is deliberately hidden and fails silently when the title string is rejected by the strict validator.

These are not design philosophy disagreements. These are execution failures. Operator evidence: the user cannot perform basic capture without knowing undocumented keyboard shortcuts.

---

## 3. What is deprecated

| Layer                            | Deprecated? | Fate |
|----------------------------------|-------------|------|
| `app/**/onething/**` routes       | Yes         | Redirect to `app/**/ithink/**` |
| `lib/features/onething/components/**` | Yes    | No further investment; replaced by `lib/features/ithink/components/**` |
| `onething-directory.mdc` doctrine (strict UI rules) | Yes | Replaced by iThink doctrine |
| OneThing dashboard nav entry      | Yes         | Replaced by iThink nav entry |

---

## 4. What is NOT deprecated

| Layer                            | Status |
|----------------------------------|--------|
| `lib/db/schema.ts` — `oneThing`, `oneThingList`, `oneThing_comment`, `oneThing_attachment` tables | Preserved — iThink writes to the same tables |
| `lib/features/onething/data/**`  | Preserved — iThink queries delegate here or to new `ithink.queries.server.ts` over the same tables |
| `lib/features/onething/actions/**` | Preserved — iThink wraps these with `erp.ithink.*` audit strings |
| `lib/features/onething/types.ts` | Preserved — `OneThingRow` is the base type for iThink |
| `lib/features/onething/constants.ts` — lifecycle states and severities | Preserved — iThink re-exports these |
| `ONETHING_STATES`, `ONETHING_SEVERITIES` | Preserved |
| OneThing cron route (`/api/cron/onething-digest`) | Preserved — to be wired to `vercel.json` during iThink step 9 |
| OneThing recurrence workflow | Preserved — iThink exposes RRULE editor in detail panel |
| Lynx grounding integration | Preserved |
| 7W1H audit cache and IAM audit writes | Preserved |

---

## 5. Migration plan

1. Build `lib/features/ithink/**` as a replacement UI surface over the same DB.
2. Add iThink routes and register in dashboard nav.
3. Add `redirect()` in each OneThing `page.tsx` pointing to its iThink equivalent.
4. Mark `lib/features/onething/components/**` as deprecated in file-level comments.
5. Do not delete `lib/features/onething/` until iThink v1 is stable and confirmed in production.

---

## 6. Governance

No new work lands in `lib/features/onething/components/**` after this ADR is accepted.

Bug fixes to `lib/features/onething/data/**` and `lib/features/onething/actions/**` are allowed if they also benefit iThink.

New features land exclusively in `lib/features/ithink/**`.
