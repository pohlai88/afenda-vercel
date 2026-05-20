# Overtime Management

## Implementation notes

- **Route:** `/{locale}/o/{orgSlug}/apps/hrm/overtime` — registry segment `overtime`, audit prefix `erp.hrm.overtime`.
- **Phase 1 (shipped):** `hrm_overtime_request` table, self/on-behalf submit, `hrm_approval` with `subjectKind: overtime_request`, Pattern C pending inbox + org recent + my-requests lists, payable minutes on approve.
- **Phase 2 (shipped):** `hrm_overtime_type` + `hrm_overtime_eligibility_rule`, type catalog on submit, eligibility validation with HR/manager exception reason, Pattern C admin lists (`hrm:overtime:types`, `hrm:overtime:eligibility`), seed default types action.
- **Phase 3 (shipped):** `hrm_overtime_policy`, `hrm_overtime_rate_rule`, `hrm_overtime_calculation_snapshot`; policy form; rate rules Pattern C list; calculation on approve (rounding, caps, multiplier, earning code); attendance reconcile panel when `compareAttendanceEnabled` (`hrm:overtime:attendance-reconcile`).
- **Phase 4 (shipped):** `approved` → `payroll_ready` action + audit; payroll-ready Pattern C list (`hrm:overtime:payroll-ready`); operational CSV export (`hrm:overtime:report`); approved-payroll mark list (`hrm:overtime:approved-payroll`).
- **Gap closure (shipped):** shift vs scheduled compare (maps **HRM-OTM-009**), policy exceptions inbox + approve/reject (maps **HRM-OTM-019** / AC 16), monetary amount on calculation snapshot (**HRM-OTM-021**), compensatory leave ledger credit on approve (**HRM-OTM-022**), payroll engine `approvedOvertimeEarnings` + period lock `paid` (**HRM-OTM-023**), org notifications on lifecycle events with in-app + email + Ably realtime + Web Push (**HRM-OTM-026**), LAM legacy OT submit blocked + list exclusion, pending-inbox bulk approve up to 25 requests (implementation gap label **bulk-016**, not **HRM-OTM-016** routing).
- **Routing & policy gates (shipped):** `hrm_overtime_approval_route` matrix (**HRM-OTM-016**) — match department, cost center, location, grade, estimated amount band, eligibility/policy exception flags; approver kinds: direct manager, manager chain, department head, HR owner, HR pool, specific user; fallback to manager chain + HR ERP pool when no rule matches. Manager chain depth from policy or rule (`managerChainMaxDepth`, max 5). Optional two-stage approval (`requireHrSecondApproval` → `approvalStage` in `hrm_approval.snapshot` + `routingRuleId` / `routingApproverKind` on snapshot). Hard submit rejection when `enforceClaimDeadlineOnSubmit`. Best-effort email via Resend on lifecycle events. Daily overdue cron `hrm-otm-overdue-watch`. LAM attendance banner linking to `/apps/hrm/overtime`.
- **Compensatory credit:** On approve, when `allowCompensatoryTime` and `compensatoryLeaveTypeCode` are set, payable minutes convert to leave days (`payableMinutes / 480`) and post as `manual_correction` on `hrm_leave_balance` for the work-date entitlement year. Idempotent per request via `erp.hrm.overtime.compensatory_leave.create` audit metadata (`overtimeRequestId`). Payroll-ready path is unchanged.
- **Bulk approve:** `bulkApproveOtmRequestsAction` reuses `executeOtmRequestApproval` (manager stage advances to HR; HR stage final-approves); partial success returns approved + failed rows; summary audit `erp.hrm.overtime.request.audit` with counts.

### ID legend (avoid confusion)

| Label | Meaning |
| --- | --- |
| **HRM-OTM-NNN** | Enterprise requirement code in the tables below (e.g. **HRM-OTM-010** = attendance reconcile). |
| **gap-*** | Implementation-tracker shorthand from the OTM plan — **not** the same number as HRM-OTM (e.g. plan **gap-010** = pre-approval routing ≠ **HRM-OTM-010**). |
| **bulk-016** | Shipped bulk approve inbox — **not** **HRM-OTM-016** dynamic approver matrix. |

## Deferred (not removed)

| Tracker | Requirement | Status | Current behavior | Touch when implementing |
| --- | --- | --- | --- | --- |

**Parallel coexistence:** Leave & Attendance `hrm_time_report` (`reportKind: overtime`) on the attendance page remains read-only for legacy rows; new OT must use this module. LAM submit is blocked; lists exclude legacy OT.

## Plan vs codebase completeness (HRM-OTM-001 … 029)

Statuses: **Shipped** = production path in code · **Partial** = subset or schema-only · **Deferred** = explicitly out of scope (see table above).

| Code | Status | Implementation anchor |
| --- | --- | --- |
| **001** | Shipped | `requestOwnOtmAction`, `applyOtmOnBehalfAction`, `OtmRequestForm` |
| **002** | Shipped | Request schema + `hrm_overtime_request` columns; Pattern C lists |
| **003** | Shipped | `HRM_OTM_TIMING_KINDS`, timing kind on submit form |
| **004** | Partial | Eligibility rules: type, department, grade, employment type — not full legal-entity/location/policy-group matrix |
| **005** | Shipped | `validateOtmEligibilityForSubmit` + exception reason on submit |
| **006** | Shipped | `HRM_OTM_DAY_CATEGORIES`, types seed, day category on request |
| **007** | Shipped | `hrm_overtime_rate_rule`, `buildOtmRateRulesListSurfaceConfiguration` |
| **008** | Shipped | Duration from time range; attendance path via policy + reconcile |
| **009** | Shipped | `otm-exception-detect.server.ts` (`shift_variance`), cleared before final approve |
| **010** | Shipped | `OtmAttendanceReconcileSection`, `compareAttendanceEnabled` |
| **011** | Shipped | Policy rounding modes in `otm-calculation.server.ts` |
| **012** | Shipped | `minOvertimeMinutes` policy gate |
| **013** | Shipped | Daily/weekly/monthly caps in policy + exception detect |
| **014** | Shipped | `hrm_overtime_exception` rows + exception inbox |
| **015** | Shipped | `hrm_approval` + two-stage `approvalStage` snapshot |
| **016** | Shipped | `hrm_overtime_approval_route`, `resolveOtmSubmissionApprovers`, `OtmApprovalRoutesSection` |
| **017** | Shipped | Approve / reject / return / adjust (`OtmDecisionForms`, `adjustOtmRequestAction`) |
| **018** | Shipped | Reject, return, and adjust require reasons |
| **019** | Shipped | Exception inbox + approve/reject actions |
| **020** | Shipped | Payable minutes on `executeOtmRequestApproval` |
| **021** | Shipped | `amountCents` on `hrm_overtime_calculation_snapshot` |
| **022** | Shipped | `otm-compensatory-leave.server.ts` on final approve |
| **023** | Shipped | `listOtmPayrollEarningsForEmployeePeriod`, payroll-ready → paid |
| **024** | Shipped | States gate export; only `payroll_ready` in payroll earnings query |
| **025** | Partial | Draft save/submit + employee cancel (`saveOwnOtmDraftAction`, `submitOtmDraftAction`, `cancelOwnOtmRequestAction`); `paid` via payroll lock only |
| **026** | Shipped | In-app + Resend email + Ably shell refresh + Web Push (`org_push_subscription`); locale-internal links `/o/{slug}/apps/hrm/overtime` |
| **027** | Partial | CSV via `OtmExportReportButton` + org recent list; no dept/manager/cost-center report cubes |
| **028** | Shipped | `resolveOtmSurfaceAccess`, ERP `hrm.overtime` permissions |
| **029** | Shipped | `HRM_OTM_AUDIT` including `requestAdjust`, `requestCancel` on lifecycle mutations |

### Implementation tracker (plan `gap-*` / `bulk-016`)

| Tracker | Maps to | Status | Anchor |
| --- | --- | --- | --- |
| **gap-009** | HRM-OTM-009 | Shipped | Shift variance exceptions |
| **gap-010** | Routing (not OTM-010) | Shipped | Manager chain, HR second approval, claim deadline |
| **gap-014** | Policy gates | Shipped | `enforceClaimDeadlineOnSubmit`, overdue cron |
| **gap-019** | HRM-OTM-019 | Shipped | `OtmExceptionInbox` |
| **gap-021** | HRM-OTM-021 | Shipped | Calculation snapshot amount |
| **gap-022** | HRM-OTM-022 | Shipped | Compensatory leave credit |
| **gap-023** | HRM-OTM-023 | Shipped | Payroll consumption |
| **gap-026** | HRM-OTM-026 | Shipped | `otm-notification.server.ts`, `#features/org-notifications` delivery (Ably + Web Push) |
| **bulk-016** | Bulk approve (not OTM-016) | Shipped | `bulkApproveOtmRequestsAction`, `OtmPendingBulkApproveToolbar` |
| **LAM OT** | Coexistence | Shipped | `attendance-otm-deprecation-notice.tsx`, LAM actions block `reportKind=overtime` |

### Metadata-driven UI (Pattern C)

All list surfaces use `GovernedPatternCListSection` + `data/otm-surface-builders.server.ts`. Canonical keys: `data/otm-surface-metadata.shared.ts` (`OTM_LIST_SURFACE_IDS`).

| `surfaceKey` | Section component | Trailing actions |
| --- | --- | --- |
| `hrm:overtime:pending-inbox` | `OtmPendingInbox` | Approve / adjust / return / reject + bulk toolbar |
| `hrm:overtime:org-recent` | `OtmOrgRequestsSection` | — |
| `hrm:overtime:my-requests` | `OtmMyRequestsSection` | Submit draft / cancel |
| `hrm:overtime:types` | `OtmTypesSection` | Seed / create (empty state) |
| `hrm:overtime:eligibility` | `OtmEligibilitySection` | Create rule dialog |
| `hrm:overtime:approval-routes` | `OtmApprovalRoutesSection` | Create routing rule dialog |
| `hrm:overtime:rate-rules` | `OtmRateRulesSection` | Create rule dialog |
| `hrm:overtime:approved-payroll` | `OtmApprovedPayrollSection` | Mark payroll-ready |
| `hrm:overtime:payroll-ready` | `OtmPayrollReadySection` | — |
| `hrm:overtime:report` | `OtmReportSection` | CSV export (header action) |
| `hrm:overtime:attendance-reconcile` | `OtmAttendanceReconcileSection` | — |
| `hrm:overtime:exception-inbox` | `OtmExceptionInbox` | Exception approve/reject |

Policy admin uses `OtmPolicySection` (form card, not a list surface). Request submit uses bespoke `OtmRequestForm` cards (Pattern A).

### Unit tests (OTM)

| File | Covers |
| --- | --- |
| `tests/unit/otm-approval-routing.shared.test.ts` | `approvalStage`, manager depth |
| `tests/unit/otm-approval-route-matching.test.ts` | Routing matrix match + priority pick |
| `tests/unit/otm-date.shared.test.ts` | Claim deadline date math |
| `tests/unit/otm-compensatory-leave.shared.test.ts` | Minutes → leave days |
| `tests/unit/otm-calculation.test.ts` | Rounding, caps, multiplier |
| `tests/unit/otm-display.test.ts` | Duration formatting |

Run: `pnpm test:fast -- tests/unit/otm-*.test.ts` (19 tests, 5 files).

## Runtime map (three layers)

| Layer | Path | Responsibility |
| --- | --- | --- |
| **1 — Route** | `app/(main)/[locale]/o/[orgSlug]/apps/hrm/overtime/page.tsx` | Locale + org session gate; re-exports `#features/hrm` `OvertimePage` only |
| **2 — Feature** | `lib/features/hrm/time-attendance/overtime-management/` | Policy, requests, approvals, exceptions, calculation, payroll export, cron tick |
| **3 — UI** | `…/overtime-management/components/*.tsx` + `#features/hrm/client` | Forms, Pattern C inboxes, policy dialog; client islands import `#features/hrm/client` only |

**Public doors:** `#features/hrm` (`OvertimePage`, `resolveOtmSurfaceAccess`) · `#features/hrm/client` (actions + client forms) · `#features/hrm/server` (`runOtmApprovalOverdueTick` for cron).

## Data model (app-owned)

| Table | Role |
| --- | --- |
| `hrm_overtime_request` | Request lifecycle (`submitted` → `approved` → `payroll_ready` → `paid`) |
| `hrm_approval` | `subjectKind: overtime_request`; `snapshot` JSON holds request copy + `approvalStage` |
| `hrm_overtime_policy` | Caps, rounding, claim deadline, `requireHrSecondApproval`, `managerChainMaxDepth`, compensatory flags |
| `hrm_overtime_exception` | Policy violations (late submission, caps, shift variance, …) — must be cleared before final approve |
| `hrm_overtime_calculation_snapshot` | Payable minutes, multiplier, monetary amount after HR approve |
| `hrm_overtime_type` / `hrm_overtime_rate_rule` / `hrm_overtime_eligibility_rule` | Catalog, pay rules, who may request |

Migration `drizzle/0011_sudden_energizer.sql` adds `enforceClaimDeadlineOnSubmit`, `requireHrSecondApproval`, `managerChainMaxDepth` on `hrm_overtime_policy`.

## Approval flow

```txt
Submit (Server Action)
  → validate eligibility + optional hard claim-deadline gate
  → insert hrm_approval (pending) + hrm_overtime_request (submitted)
  → sync policy exceptions; notify current approver

Decide (assigned approver or hrm.overtime update permission)
  IF approvalStage = manager AND requireHrSecondApproval
    → Advance to HR (request stays submitted; snapshot.approvalStage = hr)
  ELSE
    → Final approve: calculation snapshot, compensatory credit, state = approved

Reject / Return → standard hrm_approval + request state transitions
```

**Approver resolution:** walk `managerEmployeeId` chain up to `managerChainMaxDepth` (max 5) for linked portal users; else first user with `hrm.overtime` `update`. Initial stage is `manager` when second approval is on and a manager user exists; otherwise `hr`.

## Key modules (by concern)

| Concern | Files |
| --- | --- |
| Submit / on-behalf | `actions/otm-request.actions.ts`, `data/otm-request-commands.server.ts` |
| Approve / bulk | `actions/otm-approval.actions.ts`, `data/otm-approval-commands.server.ts` |
| Routing (pure) | `data/otm-approval-routing.shared.ts`, `data/otm-approver-routing.server.ts` |
| Policy | `data/otm-policy.shared.ts`, `data/otm-policy.server.ts`, `components/otm-policy-form.client.tsx` |
| Exceptions | `data/otm-exception-detect.server.ts`, `data/otm-exception.server.ts`, `components/otm-exception-inbox.tsx` |
| Calculation / payroll | `data/otm-calculation.server.ts`, `data/otm-payroll-export.server.ts`, `actions/otm-payroll.actions.ts` |
| Notifications | `data/otm-notification.server.ts`, `data/otm-notification-email.server.ts` |
| Overdue cron | `data/otm-overdue-watch.server.ts`, `app/api/cron/hrm-otm-overdue-watch/route.ts` |
| Lists (Pattern C) | `data/otm-surface-builders.server.ts`, `data/otm.queries.server.ts` |
| Audit strings | `otm.contract.ts` (`HRM_OTM_AUDIT`) |

## Definition

**Overtime Management is the HRM function that tracks, validates, approves, and calculates overtime hours, overtime eligibility, overtime rates, pay multipliers, overtime requests, overtime exceptions, and payroll-ready overtime outcomes based on configured policies and statutory rules.**

---

# Overtime Management Includes

| Area                            | What It Covers                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Overtime Request**            | Employee overtime request, manager-created overtime request, overtime reason, planned overtime        |
| **Overtime Approval**           | Manager approval, HR approval, department approval, exception approval                                |
| **Overtime Eligibility**        | Eligibility by employee type, grade, job category, location, legal entity, policy group               |
| **Overtime Hours Tracking**     | Approved hours, actual hours, payable hours, rejected hours, adjusted hours                           |
| **Overtime Type**               | Normal day overtime, rest day overtime, off day overtime, public holiday overtime, emergency overtime |
| **Overtime Rate Rules**         | 1.0x, 1.5x, 2.0x, 3.0x, fixed rate, statutory rate, company rate                                      |
| **Pay Rate Multipliers**        | Multiplier by day type, shift type, overtime type, country, employee group                            |
| **Overtime Calculation**        | Overtime amount, payable overtime, capped overtime, rounded overtime                                  |
| **Overtime Policy Enforcement** | Minimum overtime, maximum overtime, approval requirement, cutoff date, claim deadline                 |
| **Overtime Rounding Rules**     | Round up, round down, nearest interval, grace period                                                  |
| **Overtime Cap Rules**          | Daily cap, weekly cap, monthly cap, statutory cap, budget cap                                         |
| **Attendance Integration**      | Compare approved overtime with actual clock-in/out records                                            |
| **Shift Schedule Reference**    | Scheduled shift, planned hours, excess hours, rest day work, holiday work                             |
| **Compensatory Time Reference** | Time-off-in-lieu, replacement leave, overtime converted to leave                                      |
| **Payroll Integration**         | Payroll-ready overtime hours, overtime amount, overtime earning code                                  |
| **Exception Handling**          | Unapproved overtime, exceeded cap, missing attendance, late submission                                |
| **Overtime Reporting**          | Overtime by employee, department, manager, location, cost center, period                              |
| **Audit Trail**                 | Requested by, approved by, rejected by, adjusted by, calculated by, timestamp, reason                 |

---

# Overtime Management Does Not Include

| Excluded Area                     | Owned By                                 |
| --------------------------------- | ---------------------------------------- |
| Employee master profile           | Employee Records Management              |
| Organization hierarchy            | Organizational Chart & Hierarchy         |
| Shift pattern creation            | Shift Scheduling                         |
| Attendance clock-in/out capture   | Time Clock Integration                   |
| Daily attendance status           | Leave & Attendance Management            |
| Payroll final calculation         | Payroll Processing                       |
| Salary master data                | Payroll Processing / Employee Records    |
| Public holiday calendar ownership | Leave & Attendance / Calendar Management |
| GPS clock-in verification         | Geolocation & Remote Check-In            |
| Absence trend analytics           | Absence Analytics & Trends               |
| Flexible work arrangement policy  | Flexible Work Arrangement Tracking       |
| Expense reimbursement             | Expense Reimbursement                    |
| Performance management            | Performance Management                   |
| Compliance rule monitoring        | Compliance & Regulatory Tracking         |

---

# Overtime Management Requirement Statement

| Requirement             | Description                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overtime Management** | Tracks, validates, approves, and calculates overtime hours with configurable eligibility rules, overtime types, pay rate multipliers, caps, rounding rules, attendance validation, exception handling, payroll integration, reporting, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-OTM-001** | System shall allow employees or authorized managers to submit overtime requests.                                                                                       |
| **HRM-OTM-002** | System shall capture overtime date, start time, end time, duration, overtime type, reason, and employee reference.                                                     |
| **HRM-OTM-003** | System shall support planned overtime and actual overtime.                                                                                                             |
| **HRM-OTM-004** | System shall define overtime eligibility by legal entity, country, location, employment type, grade, job category, department, and policy group.                       |
| **HRM-OTM-005** | System shall prevent ineligible employees from claiming overtime unless authorized override is approved.                                                               |
| **HRM-OTM-006** | System shall support overtime types including normal day, rest day, off day, public holiday, night overtime, and emergency overtime.                                   |
| **HRM-OTM-007** | System shall configure overtime rate multipliers by overtime type, day type, shift type, employee group, and country.                                                  |
| **HRM-OTM-008** | System shall calculate overtime hours from requested time range or attendance records.                                                                                 |
| **HRM-OTM-009** | System shall compare requested overtime against scheduled shift hours.                                                                                                 |
| **HRM-OTM-010** | System shall compare approved overtime against actual clock-in/out records where attendance integration is enabled.                                                    |
| **HRM-OTM-011** | System shall apply overtime rounding rules.                                                                                                                            |
| **HRM-OTM-012** | System shall apply minimum overtime duration rules.                                                                                                                    |
| **HRM-OTM-013** | System shall apply daily, weekly, monthly, statutory, and budget overtime caps where configured.                                                                       |
| **HRM-OTM-014** | System shall flag overtime that exceeds configured limits.                                                                                                             |
| **HRM-OTM-015** | System shall support overtime approval workflow.                                                                                                                       |
| **HRM-OTM-016** | System shall route overtime approvals by manager, department, cost center, location, overtime amount, employee grade, and exception status.                            |
| **HRM-OTM-017** | System shall allow approvers to approve, reject, return, or adjust overtime requests.                                                                                  |
| **HRM-OTM-018** | System shall require rejection or adjustment reason.                                                                                                                   |
| **HRM-OTM-019** | System shall support exception approval for late submission, exceeded cap, unplanned overtime, or missing attendance.                                                  |
| **HRM-OTM-020** | System shall calculate payable overtime hours after approval.                                                                                                          |
| **HRM-OTM-021** | System shall calculate overtime amount using applicable pay rate multiplier.                                                                                           |
| **HRM-OTM-022** | System shall support overtime conversion to compensatory time or replacement leave where policy allows.                                                                |
| **HRM-OTM-023** | System shall expose approved overtime hours, rate multiplier, earning code, and amount reference to Payroll Processing.                                                |
| **HRM-OTM-024** | System shall prevent payroll export of unapproved overtime.                                                                                                            |
| **HRM-OTM-025** | System shall track overtime status including draft, submitted, pending approval, approved, rejected, returned, cancelled, payroll-ready, and paid.                     |
| **HRM-OTM-026** | System shall notify employees and approvers of submitted, approved, rejected, returned, overdue, cancelled, and payroll-ready overtime.                                |
| **HRM-OTM-027** | System shall provide overtime reports by employee, department, manager, legal entity, location, cost center, overtime type, status, and period.                        |
| **HRM-OTM-028** | System shall restrict overtime records based on employee, manager, HR, payroll, finance, and auditor permissions.                                                      |
| **HRM-OTM-029** | System shall maintain audit trail for overtime request, validation, approval, rejection, adjustment, exception, calculation, payroll export, and cancellation actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                                   |
| --: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Employee or authorized manager can submit overtime request.                                                                                           |
|   2 | Overtime request captures date, start time, end time, duration, overtime type, and reason.                                                            |
|   3 | Overtime eligibility is validated before submission or approval.                                                                                      |
|   4 | Ineligible employees are blocked unless authorized override is approved.                                                                              |
|   5 | Normal day, rest day, off day, public holiday, night, and emergency overtime types can be configured.                                                 |
|   6 | Overtime rate multipliers can be configured by overtime type, day type, shift type, country, and employee group.                                      |
|   7 | Overtime hours can be calculated from request time range or attendance records.                                                                       |
|   8 | Requested overtime can be compared against scheduled shift hours.                                                                                     |
|   9 | Approved overtime can be validated against actual clock-in/out records where enabled.                                                                 |
|  10 | Overtime rounding rules are applied correctly.                                                                                                        |
|  11 | Daily, weekly, monthly, statutory, or budget overtime caps are enforced where configured.                                                             |
|  12 | Overtime exceeding configured limits is flagged.                                                                                                      |
|  13 | Overtime request follows configured approval workflow.                                                                                                |
|  14 | Approver can approve, reject, return, or adjust overtime request.                                                                                     |
|  15 | Rejected or adjusted overtime request stores reason.                                                                                                  |
|  16 | Late, over-cap, unplanned, or missing-attendance overtime requires exception approval where configured.                                               |
|  17 | Approved overtime calculates payable hours.                                                                                                           |
|  18 | Approved overtime calculates overtime amount using applicable multiplier.                                                                             |
|  19 | Approved overtime can be converted to compensatory time where policy allows.                                                                          |
|  20 | Only approved overtime can be sent to Payroll Processing.                                                                                             |
|  21 | Payroll-ready overtime includes hours, rate multiplier, earning code, and amount reference.                                                           |
|  22 | Overtime status is visible to employee, manager, HR, and payroll users where authorized.                                                              |
|  23 | Overtime reports can be generated by employee, department, manager, cost center, type, status, and period.                                            |
|  24 | Unauthorized users cannot view, approve, adjust, or export restricted overtime records.                                                               |
|  25 | Every overtime request, validation, approval, rejection, adjustment, calculation, exception, payroll export, and cancellation creates an audit event. |
