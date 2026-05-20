# Shift Scheduling — follow-up plan (`sft_follow.md`)

**Authority:** `ARCHITECTURE.md` · this file (implementation ledger vs disk).  
**Route:** `/{locale}/o/{orgSlug}/apps/hrm/shift-scheduling`  
**Module:** `lib/features/hrm/time-attendance/shift-scheduling/`  
**Last synced:** 2026-05-21 (saved reports + SFT email templates)

---

## HRM-SFT requirement ledger (001–030)

**Summary:** 30 Done · 0 Partial · 0 Deferred.

---

## Platform features (beyond 001–030)

| Feature | Status | Notes |
| --- | --- | --- |
| Saved roster report definitions | Done | `hrm_shift_roster_report_definition` · save/delete · apply on export |
| SFT dedicated email templates | Done | `sft-notification-templates.shared.ts` · Resend via `sendAuthEmail` + in-app org notifications |

---

## Migration

- `drizzle/0016_tough_lucky_pierre.sql` — coverage, availability, schedule change.
- `drizzle/0017_damp_greymalkin.sql` — `hrm_shift_roster_report_definition` (applied locally).

---

## Verification

```bash
pnpm db:generate
pnpm lint:drizzle-journal
pnpm db:migrate:local
pnpm lint:path -- lib/features/hrm/time-attendance/shift-scheduling
pnpm gate:typecheck
pnpm test:fast -- tests/unit/sft-notification-templates.test.ts tests/unit/sft-org-unit-filter.test.ts
```

Human: `pnpm gate:push` before merge.
