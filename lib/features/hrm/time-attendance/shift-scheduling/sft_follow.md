# Shift Scheduling — follow-up plan (`sft_follow.md`)

**Authority:** `ARCHITECTURE.md` · this file (implementation ledger vs disk).  
**Route:** `/{locale}/o/{orgSlug}/apps/hrm/shift-scheduling`  
**Module:** `lib/features/hrm/time-attendance/shift-scheduling/`  
**Last synced:** 2026-05-21 (P1–P3 implementation pass)

---

## HRM-SFT requirement ledger (001–030)

Legend: **Done** · **Partial** · **Deferred**

| Code | Status | Notes |
| --- | --- | --- |
| HRM-SFT-001 | Done | Template catalog + CRUD audit |
| HRM-SFT-002 | Done | Times, break, hours, category |
| HRM-SFT-003 | Done | `patternKind` + `shiftCategory` |
| HRM-SFT-004 | Done | Roster filters: department, legal entity org unit, team org unit, position, job grade, location |
| HRM-SFT-005 | Done | `assignEmployeeShiftAction` |
| HRM-SFT-006 | Done | Bulk assign |
| HRM-SFT-007 | Done | Recurrence create + apply |
| HRM-SFT-008 | Done | Rotation + add step |
| HRM-SFT-009 | Done | Rest/off planner section (`applyRestOffPlanAction`) |
| HRM-SFT-010 | Done | Holiday planner section (`applyHolidayPlanAction`) |
| HRM-SFT-011 | Done | `hrm_shift_availability` + assign gate + section UI |
| HRM-SFT-012–015 | Done | Conflict engine |
| HRM-SFT-016–017 | Done | Coverage requirement + compare surface |
| HRM-SFT-018 | Done | Skill + position + completed training course on coverage + assign validation |
| HRM-SFT-019–023 | Done | Swap workflow + reasons |
| HRM-SFT-024 | Done | `hrm_shift_schedule_change_request` + manager inbox + approve/reject |
| HRM-SFT-025 | Done | Publish (`IfMissing`) + assign/bulk/swap/schedule-change via `publishOrgNotification` (Ably + push path) |
| HRM-SFT-026 | Done | Attendance reconcile |
| HRM-SFT-027 | Done | `listShiftPayrollReferencesForPeriod` on `#features/hrm/server` |
| HRM-SFT-028 | Done | CSV export with department + position columns |
| HRM-SFT-029–030 | Done | ERP permissions + `sft.contract.ts` audits |

**Summary:** 30 Done · 0 Partial (at spec level for this pass).

---

## Migration

- `drizzle/0016_tough_lucky_pierre.sql` — coverage `requiredPositionId` / `requiredTrainingCourseId`; tables `hrm_shift_availability`, `hrm_shift_schedule_change_request`.

---

## Deferred / v2 (not blocking merge)

| Item | Reason |
| --- | --- |
| Saved report definitions | YAGNI — filter-aware CSV export ships first |
| Full calendar UI for availability | List-first Pattern B section ships in v1 |
| Employee self-service schedule-change submit from my-swaps lane | Manager inbox + server API; employee form can wire to same action next |
| Dedicated email templates for SFT | Uses org-notifications delivery stack (in-app + push + Ably) |

---

## Verification (agent)

```bash
pnpm lint:drizzle-journal
pnpm db:migrate:local
pnpm lint:path -- lib/features/hrm/time-attendance/shift-scheduling
pnpm gate:typecheck
pnpm test:fast -- tests/unit/hrm-attendance-shift-actions.test.ts tests/unit/sft-org-unit-filter.test.ts
```

Human: `pnpm gate:push` before merge.
