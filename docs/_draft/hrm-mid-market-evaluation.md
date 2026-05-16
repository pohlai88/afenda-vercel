# HRM Module — Mid-Market ERP Evaluation Report

**Produced:** 2026-05-16 · **Revised:** 2026-05-16 (P0 governance remediation reflected in scorecard §4, narrative, and appendix)  
**Evaluator:** Automated capability audit (Cursor Agent)  
**Benchmark:** Odoo 18 HR (open-source mid-market) + BambooHR REST API (mid-market SaaS)  
**Subject:** `lib/features/hrm/` — Afenda HRM module  
**Overall score:** **67.6% capability · 72.4% architecture — Operational tier** (combined **68.9%**)

---

## Contents

1. [Executive Summary](#1-executive-summary)
2. [Scoring Methodology](#2-scoring-methodology)
3. [Benchmark Composition](#3-benchmark-composition)
4. [Capability Scorecard](#4-capability-scorecard)
5. [Architecture Overlay Scorecard](#5-architecture-overlay-scorecard)
6. [Domain-by-Domain Analysis](#6-domain-by-domain-analysis)
7. [Prioritized Improvement Backlog](#7-prioritized-improvement-backlog)
8. [Out-of-Scope Notes](#8-out-of-scope-notes)
9. [Appendix: Cross-Reference Table](#9-appendix-cross-reference-table)

---

## 1. Executive Summary

The Afenda HRM module implements **17 registered capabilities** in `HRM_CAPABILITIES` (including **bulk HR import** as `imports`) across the full HRIS lifecycle — employee master data through payroll posting and statutory compliance. Against the mid-market benchmark (Odoo 18 HR + BambooHR), the module scores **67.6% on capability breadth/quality** and **72.4% on architectural maturity**, placing it squarely in the **Operational tier** (40–69%) with clear lines toward Production (70–84%).

### Maturity tier

| Dimension | Weighted score | Max | Percentage | Tier |
|---|---|---|---|---|
| Capability (17 domains) | 182.5 | 270.0 | 67.6% | Operational |
| Architecture (6 overlays) | 76.0 | 105.0 | 72.4% | Production boundary |
| **Combined** | **258.5** | **375.0** | **68.9%** | **Operational** |

### Top-3 strengths

1. **Statutory compliance engine** — 4-country rule packs (MY/SG/ID/VN), automated watch crons, bureau delivery with retry and acknowledgement, and 10+ unit tests. No equivalent exists in Odoo or BambooHR at this depth. Genuine differentiator (Coverage 5/5).
2. **Payroll + country rule packs** — Periods, engine, finalize workflow, GL posting foundation, and 14+ unit tests covering PCB 2026, EPF, SOCSO, EIS, CPF, Indonesia manifest. Best-tested module in the codebase.
3. **Attendance & time reporting** — Shifts, aggregation, correction, OT/business trip reports, import adapter. 5 unit test files + 1 e2e spec. Closest to production-grade depth of any module.

### Top-3 gaps

1. **Employee self-service portal** — Only leave + payslips are exposed at `/p/{portalSlug}/employee`. Claims, benefits, attendance, and documents are absent. Mid-market benchmark (BambooHR employee app, Odoo employee portal) covers all five. Score: 40% — Red.
2. **Recruitment / ATS (product depth)** — P0 governance is **shipped** (Server Actions on `#features/hrm/client`, workflow/schema/action unit tests). Remaining gaps: **no e2e** spec, no skills matching (Odoo `hr_recruitment_skills`), no candidate survey screening, no SMS notifications, help-docs thin/absent. Scorecard treats recruitment as **Amber** after quality uplift; depth vs Odoo/BambooHR ATS remains the main risk.
3. **KPI goals and salary advances** — **KPI:** P0 regression tests shipped (`hrm-kpi-*.test.ts` — schema, scoring math, `summarizeKpiScores`); product surface still shallow vs BambooHR goals API (milestones, comments, aggregates, filters) and **no e2e**. Scorecard KPI row moves to **Amber**. **Advances:** still **Red** — no unit tests, no e2e, no portal, no payroll deduction schedule.

---

## 2. Scoring Methodology

### Per-capability scores

| Dimension | Scale | Description |
|---|---|---|
| **Coverage** | 0–5 | Feature presence vs mid-market baseline. 0 = absent · 1 = stub · 2 = partial · 3 = functional · 4 = production · 5 = best-in-class / differentiator |
| **Quality** | 0–5 | Tests, audit wiring, RBAC alignment, TypeScript contracts, barrel hygiene |
| **Weight** | 1–5 | Mid-market business criticality. Payroll = 5 · Attendance/Leave/Compliance = 4 · Core HR/Org/Recruitment/Benefits/Claims/Performance = 3 · KPI/Advances/Policies/Snapshot = 2 |
| **Weighted score** | — | `((Coverage + Quality) / 2) × Weight` |

### Aggregation

```
% Score = Σ weighted_score / (5 × Σ weight) × 100
```

### RAG thresholds

| Colour | Range | Meaning |
|---|---|---|
| Red | < 50% | Significant gap — blocking for production readiness |
| Amber | 50–74% | Functional but material improvement needed |
| Green | ≥ 75% | Production-grade or better |

### Maturity tiers

| Tier | Range |
|---|---|
| Foundational | < 40% |
| Operational | 40–69% |
| Production | 70–84% |
| Differentiating | ≥ 85% |

---

## 3. Benchmark Composition

### Odoo 18 HR (GitHub: `odoo/odoo`, branch `18.0`)

29 HR-related addons enumerated from `addons/hr*`:

| Addon | Capability area |
|---|---|
| `hr` | Employee master data, contracts, certifications, onboarding/offboarding |
| `hr_attendance` | Clock-in/out, approvals, kiosk, reporting |
| `hr_calendar` | Work calendars, schedule planning |
| `hr_contract` | Employment contracts, salary structures |
| `hr_expense` | Expense reports, approval workflow |
| `hr_fleet` | Vehicle management, driver profiles |
| `hr_gamification` | Badges and challenges |
| `hr_holidays` | Time off, leave types, allocation, approval |
| `hr_holidays_attendance` | Leave-attendance integration |
| `hr_holidays_contract` | Leave-contract integration |
| `hr_homeworking` | Remote work scheduling |
| `hr_homeworking_calendar` | Calendar integration for homeworking |
| `hr_hourly_cost` | Hourly rate and cost tracking |
| `hr_livechat` | HR support chat |
| `hr_maintenance` | Equipment requests |
| `hr_org_chart` | Interactive org chart visualization |
| `hr_presence` | Presence indicators |
| `hr_recruitment` | Job requisitions, applications, interview stages |
| `hr_recruitment_skills` | Skill matching in ATS |
| `hr_recruitment_sms` | SMS notifications for candidates |
| `hr_recruitment_survey` | Pre-screening surveys |
| `hr_skills` | Competency framework, skill levels, resumé lines |
| `hr_skills_slides` | eLearning integration for skills |
| `hr_skills_survey` | Skill assessment surveys |
| `hr_timesheet` | Project timesheets, billable hours |
| `hr_timesheet_attendance` | Timesheet-attendance bridge |
| `hr_work_entry` | Work entries, payslip input |
| `hr_work_entry_contract` | Contract-driven work entries |
| `hr_work_entry_holidays` | Leave-driven work entries |

**Payroll** is a separate licensed module (`hr_payroll`, `hr_payroll_community`) not enumerated in public addons but referenced in benchmark scoring.

### BambooHR REST API (Context7 `/websites/bamboohr_reference`)

Key API surface used for benchmark scoring:

| Endpoint group | Capability |
|---|---|
| `/employees/{id}` | Employee master, directory, fields |
| `/employees/{id}/time_off` | Leave balances, history, requests |
| `/time_off/requests` | Leave approval workflow |
| `/payroll/*` | Pay stubs, pay schedules, deductions |
| `/performance/employees/{id}/goals` | Goals with milestones, comments, filters, aggregates |
| `/performance/employees/{id}/reviews` | Performance review cycles |
| `/benefits/*` | Enrollment, plan, coverage levels |
| `/applicant_tracking/*` | ATS — jobs, applications, statuses |
| `/files/employee/*` | Document vault, categories |
| `/reports/*` | Custom fields, turnover, headcount |
| webhooks | Real-time event notifications |
| `/training/*` | eLearning, training records |
| `/signatures/*` | eSignature for onboarding docs |

---

## 4. Capability Scorecard

Anchored to `HRM_CAPABILITIES` in [`lib/features/hrm/constants.ts`](../../lib/features/hrm/constants.ts).

| # | Capability | Odoo ref | BambooHR ref | Coverage | Quality | Weight | Weighted | Max | % | RAG |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | workforce (Core HR) | `hr`, `hr_contract` | `/employees/*` | 4 | 4 | 5 | 20.0 | 25 | 80% | Green |
| 2 | organization (org chart) | `hr_org_chart` | `/employees/directory` | 3 | 3 | 3 | 9.0 | 15 | 60% | Amber |
| 3 | onboarding/offboarding | `hr` onboarding | `/signatures/*` | 3 | 2 | 3 | 7.5 | 15 | 50% | Amber |
| 4 | recruitment (ATS) | `hr_recruitment`, `hr_recruitment_skills` | `/applicant_tracking/*` | 3 | 3 | 3 | 9.0 | 15 | 60% | Amber |
| 5 | leave | `hr_holidays` | `/time_off/*` | 4 | 4 | 4 | 16.0 | 20 | 80% | Green |
| 6 | attendance | `hr_attendance`, `hr_presence` | time tracking | 4 | 5 | 4 | 18.0 | 20 | 90% | Green |
| 7 | benefits | `hr` benefits | `/benefits/*` | 3 | 3 | 3 | 9.0 | 15 | 60% | Amber |
| 8 | claims (expenses) | `hr_expense` | — | 4 | 2 | 3 | 9.0 | 15 | 60% | Amber |
| 9 | payroll | `hr_payroll` | `/payroll/*` | 4 | 5 | 5 | 22.5 | 25 | 90% | Green |
| 10 | performance (appraisal) | `hr` appraisal | `/performance/reviews` | 3 | 2 | 3 | 7.5 | 15 | 50% | Amber |
| 11 | kpi / goals | — | `/performance/goals` | 3 | 3 | 2 | 6.0 | 10 | 60% | Amber |
| 12 | advances (salary advance) | — | — | 2 | 1 | 2 | 3.0 | 10 | 30% | Red |
| 13 | compliance (statutory) | — (local differentiator) | — | 5 | 4 | 4 | 18.0 | 20 | 90% | Green |
| 14 | documents | `hr` documents | `/files/employee/*` | 3 | 3 | 3 | 9.0 | 15 | 60% | Amber |
| 15 | policies | handbook modules | — | 2 | 3 | 2 | 5.0 | 10 | 50% | Amber |
| 16 | snapshot (reporting) | Odoo dashboards | `/reports/*` | 3 | 2 | 2 | 5.0 | 10 | 50% | Amber |
| 17 | imports (bulk HR, CSV sessions) | — | — | 3 | 3 | 3 | 9.0 | 15 | 60% | Amber |
| | **Total** | | | | | **54** | **182.5** | **270** | **67.6%** | **Operational** |

---

## 5. Architecture Overlay Scorecard

Cross-cutting concerns not represented in `HRM_CAPABILITIES` but enforced by `AGENTS.md` contract.

| # | Overlay | Local evidence | Coverage | Quality | Weight | Weighted | Max | % | RAG |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Employee self-service portal | `/p/{portalSlug}/employee/leave`, `/payslips` only | 2 | 2 | 4 | 8.0 | 20 | 40% | Red |
| B | Audit (7W1H) | `erp.hrm.*` prefixes per capability; `afenda/hrm-pii-audit-metadata` ESLint rule | 4 | 4 | 4 | 16.0 | 20 | 80% | Green |
| C | ERP RBAC integration | `requiredPermission` per capability; ERP RBAC function vocabulary | 4 | 4 | 4 | 16.0 | 20 | 80% | Green |
| D | Localization (i18n + statutory) | 4-country rule packs; locale-first routing; MY-EA-2023 leave rules | 5 | 5 | 3 | 15.0 | 15 | 100% | Green |
| E | Workflow automation | 4 cron handlers; `payroll-finalize.workflow.ts` | 4 | 3 | 3 | 10.5 | 15 | 70% | Amber |
| F | Testing depth | 56 `tests/unit/hrm-*.test.ts` files (includes recruitment workflow/schema/actions, KPI schema/scoring/math, boarding lifecycle, performance review machine); 7 HRM e2e specs | 4 | 3 | 3 | 10.5 | 15 | 70% | Amber |
| | **Total** | | | | **21** | **76.0** | **105** | **72.4%** | **Production boundary** |

---

## 6. Domain-by-Domain Analysis

### 6.1 Workforce / Core HR — Green (80%)

**Coverage: 4 · Quality: 4 · Weight: 5**

The workforce module is the deepest in the codebase. Employee master data spans `hrm_employee`, `hrm_employee_personal_profile`, `hrm_employee_contact_profile`, `hrm_employee_identity_document`, `hrm_employee_work_authorization`, and `hrm_dependent`. Employment contracts (`hrm_employment_contract`) track version history, compensation lines (`hrm_contract_compensation_line`), and salary structures. Change history (`hrm_employee_change_history`) enables audit timelines. Offboarding is managed via `hrm_offboarding_instance`.

Unit tests cover hire adapter, timeline metadata, master schema, master history, employee schema, employment contracts, and org structure remodelling. E2E coverage via `hrm-workforce-isolation.spec.ts` validates multi-tenant isolation.

**Gap:** No skills/competency framework (Odoo `hr_skills*`), no kiosk-style self-check-in, no org chart interactive editor. The `EmployeeMasterCompleteness` type provides a completeness checker but no automated onboarding task generation from gaps.

---

### 6.2 Organization — Amber (60%)

**Coverage: 3 · Quality: 3 · Weight: 3**

Departments, positions, and job grades exist as first-class tables (`hrm_department`, `hrm_position`, `hrm_job_grade`). Assignment history is tracked via `hrm_employee_assignment` (migration `0039_hrm_org_structure_assignment.sql`). The org structure remodel test (`hrm-org-structure-remodel.test.ts`) validates structural transitions.

**Gap:** No interactive org chart visualization comparable to Odoo `hr_org_chart`. No headcount planning or FTE budget tooling. The `requiredPermission` uses `hrm.organization.read` (weaker than `search`) — no bulk org chart export. Help-docs page absent.

---

### 6.3 Onboarding / Offboarding — Amber (50%)

**Coverage: 3 · Quality: 2 · Weight: 3**

Boarding templates (`hrm_boarding_template`, `hrm_boarding_template_task`), instances (`hrm_boarding_instance`), and tasks (`hrm_boarding_task`) were introduced in migration `0049_hrm_boarding_lifecycle.sql`. Template matching (`boarding-template-matching.shared.ts`), status transitions (`boarding-status.shared.ts`), and defaults (`boarding-defaults.shared.ts`) form a complete lifecycle. Offboarding has its own mutations (`offboarding.mutations.server.ts`) and queries.

**Gap:** Boarding has a baseline unit file (`hrm-boarding-lifecycle.test.ts`) but coverage is still thinner than the six-table state machine deserves (negative paths, template forks, cron/workflow). No e2e spec. No eSignature integration for onboarding documents (BambooHR `/signatures/*`). No automated task assignment from template matching in a cron/workflow. Help-docs page absent.

---

### 6.4 Recruitment / ATS — Amber (60%)

**Coverage: 3 · Quality: 3 · Weight: 3**

ATS v1 schema was added in migration `0046_hrm_recruitment_ats_v1.sql`: `hrm_job_requisition`, `hrm_candidate`, `hrm_application`, `hrm_interview`, `hrm_job_offer`, `hrm_recruitment_event`. Workflow helpers exist in `recruitment-workflow.shared.ts` and `recruitment.queries.server.ts`. The server action file `recruitment.actions.ts` is present.

**Governance (P0 shipped):** Recruitment Server Actions are re-exported from **`#features/hrm/client`** for Client Components; they are **not** re-exported from the main `index.ts` barrel. RSC pages (e.g. `recruitment-page.tsx`) import directly from **`./actions/recruitment.actions`** — a valid pattern to keep the server graph narrow. **Unit tests:** `hrm-recruitment-workflow.test.ts` (FSM tables), `hrm-recruitment-schema.test.ts` (Zod contracts), `hrm-recruitment-actions.test.ts` (guarded action paths with mocks).

**Remaining gaps vs mid-market:** No **e2e** spec (`hrm-recruitment*.spec.ts` still absent). No skills matching (Odoo `hr_recruitment_skills`), no candidate survey screening (Odoo `hr_recruitment_survey`), no SMS notifications. Help-docs coverage remains thin or absent for ATS.

---

### 6.5 Leave Management — Green (80%)

**Coverage: 4 · Quality: 4 · Weight: 4**

One of the strongest modules. Leave types, policies, requests, balances, entitlement engine (`leave-entitlement-engine.server.ts`), and Malaysia-specific leave rules (`leave-rules/my-ea-2023-01.ts`) form a complete statutory-aligned system. Approval workflow (`leave-approval.actions.ts`), carry-forward, cancellation, absence calculation (`leave-absence.shared.ts`), and portal access (`employee-portal-leave.actions.ts`) are all wired.

Tests: `hrm-leave-request.test.ts`, `hrm-leave-absence.test.ts`, `hrm-leave-entitlement-malaysia.test.ts` plus e2e `hrm-leave-flow.spec.ts`. Portal route `/p/{portalSlug}/employee/leave` is the only portal capability outside payslips.

**Gap:** Leave policy authoring is code-heavy (rule packs) rather than admin-configurable; Odoo allows non-developer administrators to set accrual rules in UI. Balance history visualization limited.

---

### 6.6 Attendance — Green (90%)

**Coverage: 4 · Quality: 5 · Weight: 4**

Best-tested workstream in the module. Shift templates (`hrm_shift_template`), assignments (`hrm_shift_assignment`), attendance events/days (`hrm_attendance_event`, `hrm_attendance_day`), time reports (`hrm_time_report` for overtime and business trips), corrections, and an import adapter form a robust system. Day-level aggregation (`attendance-aggregator.server.ts`) with regeneration is covered by a dedicated regeneration test.

Tests: `hrm-attendance-actions.test.ts`, `hrm-attendance-shift-actions.test.ts`, `hrm-attendance-shift.test.ts`, `hrm-attendance-aggregator.test.ts`, `hrm-attendance-regeneration.test.ts`, `hrm-time-report-schema.test.ts` + e2e `hrm-attendance-flow.spec.ts`.

**Gap:** No employee self-service attendance view in the portal. No kiosk / QR / facial recognition clock-in (Odoo `hr_attendance` kiosk mode). No homeworking schedule (`hr_homeworking`). No timesheet project-billing bridge (`hr_timesheet` semantics — `hrm_time_report` covers OT/trips but not project cost allocation).

---

### 6.7 Benefits — Amber (60%)

**Coverage: 3 · Quality: 3 · Weight: 3**

Plans (`hrm_benefit`), enrollments (`hrm_benefit_enrollment`), life events (`hrm_benefit_life_event`), eligibility guards (`benefit-eligibility.shared.ts`), active-window rules (`0044_hrm_benefit_enrollment_active_window.sql`), enterprise metadata (`0042_hrm_benefits_enterprise_metadata.sql`), payroll projection (`benefit-payroll-projection.shared.ts`), and benefit census reporting (`benefit-reporting.shared.ts`) are all present.

Tests: `hrm-benefits-enterprise.test.ts`, `hrm-benefit-enrollment-guard.test.ts`, `hrm-benefit-enrollment-actions.test.ts`.

**Gap:** No portal benefits section — employees cannot self-enrol or view current coverage. No open-enrollment window UI. BambooHR has a full `/benefits/enrollment` API surface. Help-docs absent. No e2e spec.

---

### 6.8 Claims / Expenses — Amber (60%)

**Coverage: 4 · Quality: 2 · Weight: 3**

Claim types (`hrm_claim_type`), claims (`hrm_claim`), evidence (`hrm_claim_evidence`) with enterprise metadata (`0043_hrm_claims_enterprise_metadata.sql`). Submission, approval, pending inbox, evidence attachment, and cancel all have Server Actions. `claim-helpers.shared.ts` provides the shared business logic. Claims link into payroll finalize per schema comments.

Test: `hrm-claim-helpers.test.ts` (1 unit file). No e2e spec.

**Gap:** No portal claim route — employees cannot submit or track claims via the self-service portal. No e2e coverage. Only 1 unit test file for a non-trivial approval workflow. BambooHR does not provide a comparable expense-claim API so this is ahead of SaaS benchmark in feature depth but behind in test coverage.

---

### 6.9 Payroll — Green (90%)

**Coverage: 4 · Quality: 5 · Weight: 5**

Payroll is the highest-weight, best-tested capability. Profiles (`hrm_payroll_profile`), periods (`hrm_payroll_period`), runs (`hrm_payroll_run`), lines (`hrm_payroll_line`), and country rule packs (`hrm_country_rule_pack`) exist. The engine (`payroll-engine.server.ts`) drives computation; the rule pack server (`payroll-rule-pack.server.ts`) resolves locale-specific packs. Finalization uses a durable workflow (`payroll-finalize.workflow.ts`). Payroll posting writes to `accounting_journal_batch` (cross-feature with `lib/features/accounting/`). Portal exposes payslips (`hrm-employee-portal-payslips-page.tsx`, `hrm-employee-portal-payslip-detail-page.tsx`).

Tests: `hrm-payroll-engine.test.ts`, `hrm-payroll-close.test.ts`, `hrm-payroll-finalize-workflow.test.ts`, plus 9 rule-pack tests covering EPF, SOCSO, EIS, PCB 2026, Malaysia manifest, Malaysia holidays, CPF, Singapore manifest, Indonesia manifest + e2e `hrm-payroll-flow.spec.ts`.

**Gap:** GL integration remains foundational — `accounting_journal_batch` stores payroll batch JSON lines but full double-entry posting and ledger reconciliation are intentionally narrow per schema comments. Payslip styling/PDF export not evidenced.

---

### 6.10 Performance Management — Amber (50%)

**Coverage: 3 · Quality: 2 · Weight: 3**

Review cycles (`hrm_review_cycle`) and reviews (`hrm_review`) provide a basic appraisal structure. `hrm-performance-review-forms.tsx` and `performance.queries.server.ts` power the workbench UI. E2e `hrm-performance-flow.spec.ts` validates the flow.

**Gap:** `hrm-performance-review-machine.test.ts` covers the review state machine; broader appraisal form integration, multi-rater (360), goal-to-review alignment, and analytics dashboards remain light vs Odoo/BambooHR. Help-docs exist (`performance.mdx`) but are limited.

---

### 6.11 KPI / Goals — Amber (60%)

**Coverage: 3 · Quality: 3 · Weight: 2**

Tables: `hrm_kpi_metric`, `hrm_kpi_period`, `hrm_kpi_score` (migration `0047_hrm_performance_kpi_erp_v1.sql`). `kpi.queries.server.ts` and `kpi.actions.ts` are present. The KPI schema (`schemas/kpi.schema.ts`) provides Zod validation and typed scoring helpers.

**Regression gates (P0 shipped):** `hrm-kpi-schema.test.ts`, `hrm-kpi-scoring.test.ts` (includes `summarizeKpiScores` with `server-only` / `#lib/db` test doubles), and `hrm-kpi-score-math.test.ts`.

**Remaining gaps vs BambooHR goals API:** No **e2e** spec. Product surface still lacks milestones, progress bar UX, threaded comments, aggregate filters, and goal-to-review alignment. Help-docs absent for KPI.

---

### 6.12 Salary Advances — Red (30%)

**Coverage: 2 · Quality: 1 · Weight: 2**

`salary-advance.queries.server.ts` and `salary-advance.actions.ts` exist. The ERP permission key `hrm.salary_advance.search` is registered. Basic schema appears via migration `0029_hrm_dependent_kpi_advance_uplift.sql`.

**Gap:** No unit tests. No e2e spec. No portal route. No payroll deduction auto-schedule. This capability exists in neither Odoo community nor BambooHR at this tier — it is a local differentiator that needs maturation. Help-docs absent.

---

### 6.13 Compliance / Statutory — Green (90%)

**Coverage: 5 · Quality: 4 · Weight: 4**

This is the module's strongest differentiator against mid-market benchmarks. No Odoo addon and no BambooHR endpoint provide equivalent depth:

- **4-country rule packs** — Malaysia (EPF, SOCSO, EIS, PCB 2026, EA leave, public holidays), Singapore (CPF, SDL), Indonesia (BPJS, PPh21), Vietnam (SI/HI/UI)
- **Statutory submission lifecycle** — `hrm_compliance_evidence` tracks pack generation → submission → acknowledged. `org_event_delivery` manages outbound HTTP with retry and backoff.
- **Automated watches** — `hrm-compliance-aging-watch/route.ts`, `hrm-document-expiry-watch/route.ts`, `hrm-probation-watch/route.ts`, `hrm-statutory-retry/route.ts`
- **Operational health** — `compliance-operational-health.queries.server.ts`, bureau reliability scoring (`bureau-reliability*.ts`), compliance aging fan-out, orbit integration (`compliance-aging-orbit.shared.ts`)

Tests: 10+ files covering aging-fanout, aging-orbit, aging-watch, operational-health, timeline-mapping, statutory-pack, statutory-pack-csv, statutory-pack-singapore, statutory-acknowledgement-mapping, acknowledgement-transition, authority-mapping, retry-backoff, webhook-signature, bureau-reliability, document-expiry-watch.

**Gap:** No dedicated compliance e2e spec (`hrm-compliance*.spec.ts` absent). Probation-watch logic is server-side but lacks a named unit test file. Vietnam rule pack depth may lag MY/SG given fewer test files.

---

### 6.14 Documents — Amber (60%)

**Coverage: 3 · Quality: 3 · Weight: 3**

Document vault (`hrm_document`) with Vercel Blob storage, document types, classification, payload hash verification, and expiry tracking. E2e `hrm-documents-vault.spec.ts` validates upload and retrieval. `hrm-document-expiry-watch.test.ts` covers the watch logic.

**Gap:** No document-level access control beyond org RBAC (BambooHR has per-category file permissions). No bulk download. No document request workflow (employees cannot request HR to upload specific documents via portal). Help-docs covers `documents.mdx` minimally.

---

### 6.15 Policies — Amber (50%)

**Coverage: 2 · Quality: 3 · Weight: 2**

Policy capability is registered in `HRM_CAPABILITIES` and e2e `hrm-policies-flow.spec.ts` validates the flow. RBAC is wired.

**Gap:** No unit tests. No detail on what the policy module covers (handbook, policy versioning, acknowledgement tracking?). BambooHR and Odoo both provide handbook-style employee self-service for policies — no portal surface exposed locally. Help-docs absent.

---

### 6.16 Snapshot / Reporting — Amber (50%)

**Coverage: 3 · Quality: 2 · Weight: 2**

`hrm-snapshot-page.tsx` and `hrm-snapshot.queries.server.ts` provide a workbench reporting surface. Nexus pressure (`hrm-nexus-pressure.shared.ts`) and rail pressure (`hrm-rail-pressure.shared.ts`) drive badge counts. Benefit census reporting helpers and compliance operational-health dashboards augment analytics. Tests: `hrm-nexus-pressure-mapper.test.ts`, `hrm-rail-pressure.test.ts`.

**Gap:** No dedicated management reporting (headcount, turnover, attrition). BambooHR `/reports/*` includes turnover, headcount by department, custom field reports — no local equivalent. No scheduled report delivery. Help-docs absent.

---

### 6.17 Bulk HR import (`imports`) — Amber (60%)

**Coverage: 3 · Quality: 3 · Weight: 3**

The **`imports`** capability is registered in **`HRM_CAPABILITIES`** with audit prefix **`erp.hrm.import`**, primary segment **`imports`**, and ERP permission **`hrm.import.search`** (see [`lib/features/hrm/constants.ts`](../../lib/features/hrm/constants.ts)). The dashboard segment allowlist includes **`imports`** in [`#lib/hrm-dashboard.shared`](../../lib/hrm-dashboard.shared.ts). The route [`app/[locale]/o/[orgSlug]/dashboard/hrm/imports/page.tsx`](../../app/[locale]/o/[orgSlug]/dashboard/hrm/imports/page.tsx) gates access via **`getHrmCapabilityById("imports")`** and **`getErpPermissionDefinition`** so permissions stay registry-sourced. Bulk CSV / governed import sessions are implemented in **`hrm-import.actions.ts`** and composed through **`HrmImportsPage`**.

**Gap:** No dedicated **`hrm-import*.test.ts`** file yet (import flows rely on broader contract and integration discipline). No help-docs page specifically for imports. Mid-market products often pair bulk import with job monitoring UI — local execution may lean on shared execution rails instead.

---

## 7. Prioritized Improvement Backlog

### P0 — Governance and correctness (**completed 2026-05-16**)

These items were **blocking** in the prior audit; they are now **implemented** in `main` (see §6.4, §6.11, §6.17, appendix).

| ID | Resolution |
|---|---|
| **P0-01** | **`imports`** is a first-class **`HRM_CAPABILITIES`** row (`erp.hrm.import`, segment `imports`, permission **`hrm.import.search`**). **`#lib/hrm-dashboard.shared`** allowlists the segment. **`imports/page.tsx`** resolves access via **`getHrmCapabilityById("imports")`** + **`getErpPermissionDefinition`** + **`canUseErpPermissionForCurrentOrg`**. i18n keys exist under **`Dashboard.Hrm`** for nav/cards/placeholders (fixtures parity). |
| **P0-02** | **Recruitment** Server Actions are exported from **`#features/hrm/client`**, not from **`#features/hrm`** `index.ts`. |
| **P0-03** | **Recruitment unit tests:** `hrm-recruitment-workflow.test.ts`, `hrm-recruitment-schema.test.ts`, `hrm-recruitment-actions.test.ts`. |
| **P0-04** | **KPI unit tests:** `hrm-kpi-schema.test.ts`, `hrm-kpi-scoring.test.ts`, `hrm-kpi-score-math.test.ts`. |

### P0 follow-ups (non-blocking)

| Topic | Next step |
|---|---|
| **Imports tests** | Add `hrm-import*.test.ts` (session lifecycle, rollback JSON, CSV row guards) — see §6.17 gap. |
| **Recruitment e2e** | Still tracked as **P1-05** below. |

### P1 — Capability parity with mid-market baseline (high business value, medium effort)

| ID | Issue | Location | Benchmark gap |
|---|---|---|---|
| P1-01 | Employee portal covers only leave + payslips — claims, benefits, attendance, documents absent | `lib/features/hrm/components/employee-portal-section-nav.tsx`, `app/[locale]/p/[portalSlug]/employee/` | BambooHR employee app + Odoo employee portal both expose all five. Green benchmark is ≥ 3 portal sections |
| P1-02 | Boarding lifecycle tests exist but depth is thin vs 6-table state machine | `tests/unit/hrm-boarding-lifecycle.test.ts`, `lib/features/hrm/data/boarding*.ts` | Expand negative paths, template fork matrix, and workflow/cron hooks |
| P1-03 | No claims e2e spec | `tests/e2e/` — no `hrm-claims*.spec.ts` | Claims approval is a 3-party workflow; regression requires browser-level flow |
| P1-04 | No compliance e2e spec | `tests/e2e/` — no `hrm-compliance*.spec.ts` | Compliance submission lifecycle (generate → submit → acknowledge) needs browser-level validation |
| P1-05 | No recruitment e2e spec | `tests/e2e/` — no `hrm-recruitment*.spec.ts` | ATS pipeline is multi-step; regression requires browser-level flow |
| P1-06 | KPI goals lack milestones, progress bars, comments, and aggregate filters | `lib/features/hrm/data/kpi.queries.server.ts`, `schemas/kpi.schema.ts` | BambooHR goals API has milestones, comments, filters, aggregates — local KPI is 3/5 coverage vs BambooHR's baseline |
| P1-07 | Performance review machine tests exist; broader appraisal UI + cycle integration still light | `tests/unit/hrm-performance-review-machine.test.ts`, `performance.actions.ts` | Add tests for cycle activation edge cases + multi-reviewer scenarios when product expands |
| P1-08 | Help-docs cover only a subset of **17** HRM capabilities | `content/help-docs/hrm/` | Missing or thin: onboarding, recruitment, claims, benefits, compliance, advances, KPI, snapshot, organization, policies, **imports** |

### P2 — Differentiators and depth improvements (lower urgency, high strategic value)

| ID | Issue | Location | Opportunity |
|---|---|---|---|
| P2-01 | Skills/competency framework absent | — (no `hrm_skill*` tables) | Odoo `hr_skills*` is table-stakes in mid-market; needed for recruitment skill matching and performance competency review |
| P2-02 | Salary advances under-matured — no portal, no payroll auto-deduction schedule | `lib/features/hrm/actions/salary-advance.actions.ts`, no portal route | Advances is a genuine differentiator for SEA market; needs portal exposure + deduction scheduling to be usable |
| P2-03 | Benefits portal absent | `app/[locale]/p/[portalSlug]/employee/` | Self-enrolment and coverage visibility — table-stakes in BambooHR |
| P2-04 | Org chart is static read — no interactive builder or headcount planning | `lib/features/hrm/components/organization-page.tsx` | Odoo `hr_org_chart` provides drag-drop hierarchy editing |
| P2-05 | No eLearning / training records module | — | Odoo `hr_skills_slides` / BambooHR `/training/*`; useful for onboarding completion tracking |
| P2-06 | No eSignature for onboarding and contracts | — | BambooHR `/signatures/*`; boarding lifecycle has no digital sign-off evidence link |
| P2-07 | Reporting/snapshot has no scheduled delivery or headcount/turnover analytics | `lib/features/hrm/data/hrm-snapshot.queries.server.ts` | BambooHR turnover + headcount reports; Odoo dashboards provide trend analytics |
| P2-08 | Homeworking / remote schedule not present | — | Odoo `hr_homeworking*`; increasingly standard in hybrid-work HRIS |
| P2-09 | Policies capability has no documented feature scope or unit tests | `lib/features/hrm/` — no `hrm-policies*.test.ts` | It is unclear whether the policies segment manages written policies, procedures, or acknowledgement workflows |
| P2-10 | Vietnam rule pack depth lags MY/SG — no dedicated test file | `lib/features/hrm/data/rule-packs/` | MY has 6 test files, SG has 2, ID has 1, VN has 0 dedicated unit tests |

---

## 8. Out-of-Scope Notes

The following Odoo HR addons are absent from the local module and assessed as **intentionally out of scope** for the current Afenda HRIS target market:

| Addon | Reason absent |
|---|---|
| `hr_fleet` | Vehicle management is orthogonal to core HRIS; no stated product requirement |
| `hr_maintenance` | Equipment request tracking — product scope boundary |
| `hr_gamification` | Badges and challenges — product-level decision |
| `hr_livechat` | HR support chat — handled by Lynx / general knowledge layer |
| `hr_hourly_cost` | Project cost rate — covered by future timesheet integration if needed |
| `hr_skills_slides` / `hr_skills_survey` | eLearning integration — depends on LMS availability |
| BambooHR webhooks | Real-time event delivery — partially covered by `org_event_delivery` for statutory; not yet general-purpose |

These exclusions do not negatively affect scoring but should be documented as product-level scope decisions in `AGENTS.md` or a future ADR.

---

## 9. Appendix: Cross-Reference Table

### Actions (33 files — `lib/features/hrm/actions/`)

| File | Capability | In `client.ts` |
|---|---|---|
| `attendance-correction.actions.ts` | attendance | Yes |
| `attendance-shift.actions.ts` | attendance | Yes |
| `benefit-enrollment.actions.ts` | benefits | Yes |
| `benefit-life-event.actions.ts` | benefits | Yes |
| `benefit-plan.actions.ts` | benefits | Yes |
| `claim-approval.actions.ts` | claims | Yes |
| `claim-submission.actions.ts` | claims | Yes |
| `compliance.actions.ts` | compliance | Yes |
| `dependent.actions.ts` | workforce | Yes |
| `employee-portal-access.actions.ts` | portal | Yes |
| `employee-portal-leave.actions.ts` | portal | Yes |
| `employee-master.actions.ts` | workforce | Yes |
| `employee.actions.ts` | workforce | Yes |
| `employment-contract.actions.ts` | workforce | Yes |
| `hrm-document.actions.ts` | documents | Yes |
| `hrm-import.actions.ts` | imports | No |
| `kpi.actions.ts` | kpi | Yes |
| `leave-approval.actions.ts` | leave | Yes |
| `leave-policy.actions.ts` | leave | Yes |
| `leave-request.actions.ts` | leave | Yes |
| `offboarding.actions.ts` | onboarding | Yes |
| `onboarding.actions.ts` | onboarding | Yes |
| `org-structure.actions.ts` | organization | Yes |
| `payroll-close.actions.ts` | payroll | Yes |
| `payroll-lock-approval.actions.ts` | payroll | Yes |
| `payroll-period.actions.ts` | payroll | Yes |
| `payroll-profile.actions.ts` | payroll | Yes |
| `performance.actions.ts` | performance | Yes |
| `recruitment.actions.ts` | recruitment | Yes |
| `salary-advance.actions.ts` | advances | Yes |
| `statutory-acknowledgement.actions.ts` | compliance | Yes |
| `statutory-submission.actions.ts` | compliance | Yes |
| `time-report.actions.ts` | attendance | Yes |
| `time-report-approval.actions.ts` | attendance | Yes |

### Routes

| URL pattern | Capability | Portal? |
|---|---|---|
| `/{locale}/o/{slug}/dashboard/hrm/employees` | workforce | No |
| `/{locale}/o/{slug}/dashboard/hrm/employees/[employeeId]` | workforce | No |
| `/{locale}/o/{slug}/dashboard/hrm/organization` | organization | No |
| `/{locale}/o/{slug}/dashboard/hrm/onboarding` | onboarding | No |
| `/{locale}/o/{slug}/dashboard/hrm/recruitment` | recruitment | No |
| `/{locale}/o/{slug}/dashboard/hrm/leave` | leave | No |
| `/{locale}/o/{slug}/dashboard/hrm/attendance` | attendance | No |
| `/{locale}/o/{slug}/dashboard/hrm/benefits` | benefits | No |
| `/{locale}/o/{slug}/dashboard/hrm/claims` | claims | No |
| `/{locale}/o/{slug}/dashboard/hrm/claims/[claimId]` | claims | No |
| `/{locale}/o/{slug}/dashboard/hrm/payroll` | payroll | No |
| `/{locale}/o/{slug}/dashboard/hrm/performance` | performance | No |
| `/{locale}/o/{slug}/dashboard/hrm/kpi` | kpi | No |
| `/{locale}/o/{slug}/dashboard/hrm/advances` | advances | No |
| `/{locale}/o/{slug}/dashboard/hrm/compliance` | compliance | No |
| `/{locale}/o/{slug}/dashboard/hrm/compliance/[evidenceId]` | compliance | No |
| `/{locale}/o/{slug}/dashboard/hrm/documents` | documents | No |
| `/{locale}/o/{slug}/dashboard/hrm/policies` | policies | No |
| `/{locale}/o/{slug}/dashboard/hrm/snapshot` | snapshot | No |
| `/{locale}/o/{slug}/dashboard/hrm/imports` | imports | No |
| `/{locale}/p/{portalSlug}/employee/leave` | leave | **Yes** |
| `/{locale}/p/{portalSlug}/employee/payslips` | payroll | **Yes** |
| `/{locale}/p/{portalSlug}/employee/payslips/[documentId]` | payroll | **Yes** |

### Drizzle migrations (HRM-related)

| Migration | Purpose |
|---|---|
| `0006_mushy_charles_xavier.sql` | Initial HRM org/employee DDL |
| `0010_hrm_contract_payroll_document.sql` | Employment contract + payroll/document linkage |
| `0012_hrm_leave_policy.sql` | Leave policy schema |
| `0013_hrm_leave_request.sql` | Leave requests + balances |
| `0014_hrm_attendance.sql` | Attendance events/days |
| `0015_hrm_payroll.sql` | Payroll periods/runs/lines foundation |
| `0016_hrm_country_rule_pack.sql` | Country rule pack registry |
| `0017_hrm_compliance_evidence.sql` | Compliance evidence store |
| `0020_hrm_acknowledgement_provenance.sql` | Statutory acknowledgement provenance |
| `0021_hrm_authority_payload_hash.sql` | Authority payload hashing |
| `0024_hrm_claims_benefits_stub.sql` | Claims/benefits stub tables |
| `0027_hrm_id_rule_pack_registry_seed.sql` | Indonesia rule pack seed |
| `0028_hrm_onboarding_performance.sql` | Onboarding + performance tables |
| `0029_hrm_dependent_kpi_advance_uplift.sql` | Dependents, KPI, salary advance uplift |
| `0030_hrm_benefits_phase5.sql` | Benefits phase 5 schema |
| `0031_hrm_contract_compensation.sql` | Contract compensation lines |
| `0032_hrm_time_report.sql` | Time report workflow |
| `0033_hrm_viet_erp_plan_0033.sql` | Vietnam ERP/HRM plan slice |
| `0034_hrm_vn_rule_pack_registry_seed.sql` | Vietnam rule pack seed |
| `0038_hrm_employee_master_record.sql` | Employee master normalization |
| `0039_hrm_org_structure_assignment.sql` | Org structure + assignments |
| `0041_hrm_shift_schedule_foundation.sql` | Shift templates/assignments |
| `0042_hrm_benefits_enterprise_metadata.sql` | Benefits enterprise metadata |
| `0043_hrm_claims_enterprise_metadata.sql` | Claims enterprise metadata |
| `0044_hrm_benefit_enrollment_active_window.sql` | Benefit enrollment active-window rules |
| `0045_payroll_posting_foundation.sql` | Accounting journal batch + payroll posting |
| `0046_hrm_recruitment_ats_v1.sql` | Recruitment ATS v1 |
| `0047_hrm_performance_kpi_erp_v1.sql` | Performance + KPI ERP bindings |
| `0048_portal_employee_access_uniqueness.sql` | Unique active employee portal access |
| `0049_hrm_boarding_lifecycle.sql` | Boarding lifecycle |

### Unit tests (56 `hrm-*.test.ts` files under `tests/unit/`, 2026-05-16)

**Well-covered domains:** attendance (6+ files), payroll (3 files), statutory/compliance (13+ files), benefits (3 files), leave (3 files), employee/core HR (6+ files), **recruitment (3 files)**, **KPI (3 files)**.

**Thin or missing:** bulk **import** session file (`hrm-import*.test.ts` not yet present), **advances**, **policies**-named unit file, **snapshot** reporting logic (partial via nexus/rail pressure tests), **portal** detailed flows beyond `hrm-employee-portal-contract.test.ts`.

### E2E specs (7 HRM-specific)

| Spec | Coverage |
|---|---|
| `hrm-attendance-flow.spec.ts` | Attendance |
| `hrm-documents-vault.spec.ts` | Documents |
| `hrm-leave-flow.spec.ts` | Leave |
| `hrm-payroll-flow.spec.ts` | Payroll |
| `hrm-performance-flow.spec.ts` | Performance |
| `hrm-policies-flow.spec.ts` | Policies |
| `hrm-workforce-isolation.spec.ts` | Core HR / multi-tenant |

**Missing e2e:** claims, compliance, recruitment, benefits, onboarding, KPI, advances, portal flows (leave portal and payslip portal lack dedicated specs).
