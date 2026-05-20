# Overtime Management

## Implementation notes

- **Route:** `/{locale}/o/{orgSlug}/apps/hrm/overtime` — registry segment `overtime`, audit prefix `erp.hrm.overtime`.
- **Phase 1 (shipped):** `hrm_overtime_request` table, self/on-behalf submit, `hrm_approval` with `subjectKind: overtime_request`, Pattern C pending inbox + org recent + my-requests lists, payable minutes on approve.
- **Phase 2 (shipped):** `hrm_overtime_type` + `hrm_overtime_eligibility_rule`, type catalog on submit, eligibility validation with HR/manager exception reason, Pattern C admin lists (`hrm:overtime:types`, `hrm:overtime:eligibility`), seed default types action.
- **Phase 3 (shipped):** `hrm_overtime_policy`, `hrm_overtime_rate_rule`, `hrm_overtime_calculation_snapshot`; policy form; rate rules Pattern C list; calculation on approve (rounding, caps, multiplier, earning code); attendance reconcile panel when `compareAttendanceEnabled` (`hrm:overtime:attendance-reconcile`).
- **Phase 4 (shipped):** `approved` → `payroll_ready` action + audit; payroll-ready Pattern C list (`hrm:overtime:payroll-ready`); operational CSV export (`hrm:overtime:report`); approved-payroll mark list (`hrm:overtime:approved-payroll`).
- **Gap closure (shipped):** shift vs scheduled compare (`009`), policy exceptions inbox + approve/reject (`019`), monetary amount on calculation snapshot from active contract salary (`021`), compensatory leave ledger credit on approve when policy allows (`022`), payroll engine consumes `payroll_ready` rows via `approvedOvertimeEarnings` + period lock marks `paid` (`023`), org notifications on submit/approve/reject/return/payroll-ready/exception (`026`), LAM overtime time-report submit blocked and lists exclude legacy OT rows, pending-inbox bulk approve up to 25 requests (`016`).
- **Compensatory credit:** On approve, when `allowCompensatoryTime` and `compensatoryLeaveTypeCode` are set, payable minutes convert to leave days (`payableMinutes / 480`) and post as `manual_correction` on `hrm_leave_balance` for the work-date entitlement year. Idempotent per request via `erp.hrm.overtime.compensatory_leave.create` audit metadata (`overtimeRequestId`). Payroll-ready path is unchanged.
- **Bulk approve:** `bulkApproveOtmRequestsAction` reuses `executeOtmRequestApproval`; partial success returns approved + failed rows; summary audit `erp.hrm.overtime.request.audit` with counts.

## Deferred (not removed)

| ID | Item | Notes |
| --- | --- | --- |
| **010** | Pre-approval routing | Exceptions + eligibility only; no multi-stage pre-approval graph |
| **014** | Manager hierarchy routing | Single `currentApproverUserId` on `hrm_approval` |
| **016** (routing) | Amount/grade/location-based approver matrix | **Bulk approve inbox shipped**; dynamic routing still deferred |
| **026** | Email / push notifications | In-app org notifications only |
| **claimDeadlineDays** | Late-submission enforcement | Policy field stored; submit/approve deadline gate not wired |
| **LAM** | Legacy `hrm_time_report` OT rows | Hidden from lists; not deleted |
- **Parallel coexistence:** Leave & Attendance `hrm_time_report` (`reportKind: overtime`) on the attendance page remains active until a dedicated deprecation pass. This module is the future system of record for policy, rates, caps, and payroll-ready overtime (see LAM ARCHITECTURE — overtime rate/calculation excluded there).

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
