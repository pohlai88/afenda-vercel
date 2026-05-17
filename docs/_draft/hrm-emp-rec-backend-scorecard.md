# HRM Employee Records — Backend Scorecard

**Scope:** Backend, metadata contracts, and unit tests only (no governed UI wiring).  
**Canonical module:** `lib/features/hrm/employee-management/employee-records-management/`  
**Scored:** 2026-05-17 (post backend-closure pass)

## Summary

| Metric | Before (pre-closure inventory) | After (backend closure) |
| --- | ---: | ---: |
| **HRM-EMP-REC-001–020 Met** | 3 | 14 |
| **Partial** | 11 | 6 |
| **Not met** | 6 | 0 |
| **Acceptance criteria AC 1–14 Met** | 5 | 12 |
| **AC Partial** | 6 | 2 |
| **AC Not met** | 3 | 0 |

**Legend:** **Met** = schema + server mutations/queries + metadata contract + tests where applicable. **Partial** = backend exists but UI not wired, or delegated effective-dated assignment UX to org-structure. **Not met** = no durable backend path.

---

## HRM-EMP-REC-001–020

| ID | Requirement | Before | After | Evidence |
| --- | --- | --- | --- | --- |
| 001 | Workforce list / search surface | Partial | **Met** | `workforce-list-surface.server.ts`, `EMPLOYEE_RECORDS_LIST_SURFACE_IDS`, ERP `hrm.employee.search` |
| 002 | Create employee (master bootstrap) | Partial | **Met** | `createEmployeeMutation`, `createEmployeeAction`, `createEmployeeFormSchema` superRefine, duplicate gate |
| 003 | Identity + profile photo | Partial | **Met** | Personal profile + `updateEmployeeIdentityAction`, `updateEmployeeProfilePhotoAction`, identity documents |
| 004 | Demographics / language preference | Partial | **Met** | `languagePreference` on personal profile; schema + identity action |
| 005 | Contact + mailing address | Partial | **Met** | `hrm_employee_contact_profile.mailingAddress`; `updateEmployeeContactAction` persists mailing |
| 006 | Emergency contacts | Partial | **Partial** | `emergency-contact.actions.ts` + table; HR workbench UI still deferred (ESS portal only) |
| 007 | Employment type + contract dates | Partial | **Met** | `employmentType` on employee; contract dates read/write via active `hrm_employment_contract` in employment action |
| 008 | Worker category + grade level | Partial | **Met** | `workerCategory`, `employeeLevel` in employment action + schema |
| 009 | Organization assignment refs | Partial | **Partial** | Cached placement on `hrm_employee`; effective-dated rows via org-structure `assignEmployeePlacementAction` |
| 010 | Reporting lines + HR owner | Partial | **Met** | `managerEmployeeId`, `dottedLineManagerId`, `hrOwnerEmployeeId` in employment action |
| 011 | Employment / assignment history | Not met | **Met** | `listEmployeeEmploymentHistory`, lifecycle + assignment + change rows |
| 012 | Lifecycle event stream | Not met | **Met** | `hrm_lifecycle_event` + `employee-rehire-lifecycle.server.ts` |
| 013 | Identity documents + work authorization | Met | **Met** | Upsert actions + tables + change history |
| 014 | Profile completeness (compute) | Met | **Met** | `deriveEmployeeMasterCompleteness` unchanged; metadata field policies added |
| 015 | Duplicate detection (AC-3) | Partial | **Met** | `checkEmployeeDuplicates` / `assertNoEmployeeDuplicates` on create, contact, identity doc |
| 016 | Rehire without history loss | Partial | **Met** | `rehireEmployeeMutation`, lifecycle event, audit `create_rehire` |
| 017 | Cost center / work location context | Partial | **Partial** | `resolveEmployeeOrgContextReference`; assignment `costCenterCode` via org-structure only |
| 018 | Dependents | Not met | **Partial** | `dependent.actions.ts` in module (out of EMP-REC UI scope; backend present) |
| 019 | Field-level audit + effective meta | Partial | **Met** | `changeMeta` on all `historyInsertValues`; paginated `listEmployeeChangeHistory` with meta columns |
| 020 | Archive / separated (read-only) | Met | **Met** | `archiveEmployeeAction`, `deprecate` audit, offboarding hooks |

---

## Acceptance criteria AC 1–14

| AC | Criterion | Before | After |
| --- | --- | --- | --- |
| 1 | Tenant isolation from session | Met | **Met** |
| 2 | ERP permission gates (`read` / `update` / `create`) | Met | **Met** |
| 3 | Duplicate detection (email, phone, identity) | Partial | **Met** |
| 4 | Archived employees read-only | Met | **Met** |
| 5 | Audit after successful mutation | Met | **Met** |
| 6 | Field history with PII redaction | Met | **Met** |
| 7 | Effective-dated placement history (data) | Partial | **Met** |
| 8 | Rehire preserves prior rows | Partial | **Met** |
| 9 | Profile completeness scoring | Met | **Met** |
| 10 | Metadata field catalog for governed UI | Not met | **Met** |
| 11 | Surface metadata builders | Not met | **Met** |
| 12 | Employment history API for surfaces | Not met | **Met** |
| 13 | Change history pagination + meta | Partial | **Met** |
| 14 | Public `#features/hrm` server/client exports | Partial | **Met** |

---

## Remaining gaps (explicitly out of scope)

- HR workbench UI for emergency contacts, rehire button, assignment history panel, change-history effective date columns.
- Effective-dated **master field** edits beyond `changeMeta` form fields (assignments remain org-structure owned).
- Governed renderer wiring to `employee-records-surface-builders.server.ts` (metadata-only delivery in this phase).

---

## Verification commands (last run)

```powershell
pnpm exec eslint --max-warnings=0 lib/features/hrm/employee-management/employee-records-management/ lib/features/hrm/schemas/employee.schema.ts lib/features/hrm/data/employee-master.queries.server.ts lib/features/hrm/data/employee.queries.server.ts lib/features/hrm/data/employee.mutations.server.ts lib/features/hrm/actions/employee-master.actions.ts lib/features/hrm/actions/employee.actions.ts lib/features/hrm/server.ts lib/features/hrm/client.ts tests/unit/hrm-employee-*.test.ts
pnpm typecheck
pnpm typecheck:test
pnpm test:fast -- tests/unit/hrm-employee-*.test.ts
```
