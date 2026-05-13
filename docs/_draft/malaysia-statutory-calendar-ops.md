# Malaysia statutory calendar & rule-pack operations

This note is the **operator + engineer** checklist for extending Malaysia payroll
holiday tables and regulator version pins without breaking leave planning or
compliance evidence.

## Public holidays (leave / attendance)

1. **Add a new calendar year file** under
   `lib/features/hrm/data/rule-packs/malaysia/holidays/v{YYYY}.holidays.ts`
   exporting:
   - `HOLIDAYS_{YYYY}_CODE` (e.g. `MY-HOLIDAY-2027`)
   - `MALAYSIA_HOLIDAYS_{YYYY}` array (`MalaysiaHolidayEntry` — reuse the type from `v2026.holidays.ts`)
   - `getHolidaysV{YYYY}(year, stateCodes)` and `countHolidaysV{YYYY}` if tests need it.

2. **Register the year in the dispatcher**
   `lib/features/hrm/data/rule-packs/malaysia/holidays/resolve-malaysia-public-holidays.ts`
   — extend the `year === …` chain so `resolveMalaysiaPublicHolidayDates` covers the new year.
   Unsupported years throw with an explicit message (fail loud instead of silent wrong calendars).

3. **i18n** — each holiday date surfaced via `hrm.holiday.MY.{date}` needs a matching key under
   `messages/en.json` → `hrm.holiday.MY` (and other locales when they ship).

4. **Tests** — extend `tests/unit/hrm-rule-pack-malaysia-holidays.test.ts` and add a manifest smoke
   test that `publicHolidays()` does not throw for the new year (see
   `tests/unit/hrm-rule-pack-malaysia-manifest.test.ts`).

5. **Composite manifest** — `MY-2026-01` keeps `holidayVersion: MY-HOLIDAY-2026` as the **pinned**
   payroll-period manifest string; multi-year dispatch is intentional so operators are not blocked
   on calendar year 2027+ before a new composite pack ships.

## Regulator tables (EPF / SOCSO / EIS / PCB)

Follow the existing pattern: **new version file** (e.g. `pcb/v2027-01.bands.ts`) + either a new
composite `my-2027-01.rule-pack.ts` **or** adjust `effectiveTo` on the prior composite row in
`RULE_PACK_REGISTRY` (`payroll-rule-pack.server.ts`). Never edit shipped historical tables in place;
append-only files preserve audit replay.

## Verification

After touching rule packs or messages: `pnpm typecheck && pnpm lint` (per task gate), plus the
Malaysia holiday / PCB unit tests.
