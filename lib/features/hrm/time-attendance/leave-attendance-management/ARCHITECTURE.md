# Leave & Attendance Management

## Definition

**Leave & Attendance Management is the HRM function that tracks employee attendance, manages leave entitlement, leave applications, leave balances, attendance exceptions, absence records, approval workflows, policy enforcement, and payroll-ready attendance outcomes.**

---

# Leave & Attendance Management Includes

| Area                              | What It Covers                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Attendance Records**            | Daily attendance status, present, absent, late, early out, half-day, missing punch                                  |
| **Leave Entitlement**             | Annual leave, medical leave, unpaid leave, maternity leave, paternity leave, compassionate leave, replacement leave |
| **Leave Balance**                 | Opening balance, earned leave, used leave, pending leave, adjusted leave, forfeited leave, carried-forward leave    |
| **Leave Application**             | Leave request, leave type, leave dates, reason, supporting document, approval status                                |
| **Leave Approval Workflow**       | Manager approval, HR approval, multi-level approval, delegation, escalation                                         |
| **Leave Policy Enforcement**      | Eligibility, entitlement rules, minimum notice period, blackout dates, maximum consecutive days                     |
| **Attendance Policy Enforcement** | Lateness rule, early departure rule, absence rule, grace period, workday rule                                       |
| **Holiday Calendar Reference**    | Public holiday, company holiday, regional holiday, replacement holiday                                              |
| **Work Calendar Reference**       | Working day, rest day, off day, weekend, company calendar                                                           |
| **Attendance Exception Handling** | Missing clock-in, missing clock-out, late arrival, early departure, unapproved absence                              |
| **Leave Adjustment**              | Manual adjustment, carry-forward adjustment, forfeiture, correction, encashment reference                           |
| **Medical Leave Tracking**        | Medical certificate reference, panel clinic reference, hospitalization reference                                    |
| **Unpaid Leave Tracking**         | Unpaid leave duration, payroll deduction reference, approval status                                                 |
| **Absence Tracking**              | Approved absence, unapproved absence, no-show, emergency leave, extended absence                                    |
| **Attendance Summary**            | Days worked, leave taken, absent days, late count, early-out count                                                  |
| **Payroll Integration**           | Approved unpaid leave, attendance deductions, overtime reference, absence deduction reference                       |
| **Audit Trail**                   | Submitted by, approved by, rejected by, adjusted by, timestamp, reason, evidence                                    |

---

# Leave & Attendance Management Does Not Include

| Excluded Area                               | Owned By                           |
| ------------------------------------------- | ---------------------------------- |
| Employee master profile                     | Employee Records Management        |
| Organization hierarchy                      | Organizational Chart & Hierarchy   |
| Payroll calculation                         | Payroll Processing                 |
| Overtime rate configuration and calculation | Overtime Management                |
| Shift pattern design                        | Shift Scheduling                   |
| Physical time clock device integration      | Time Clock Integration             |
| GPS-based clock-in/out                      | Geolocation & Remote Check-In      |
| Absence trend analytics                     | Absence Analytics & Trends         |
| Hybrid/remote work schedule policy          | Flexible Work Arrangement Tracking |
| Final salary computation                    | Payroll Processing                 |
| Benefits enrollment                         | Benefits Administration            |
| Expense claims                              | Expense Reimbursement              |
| Performance review                          | Performance Management             |
| Compliance case handling                    | Compliance & Regulatory Tracking   |

---

# Leave & Attendance Management Requirement Statement

| Requirement                       | Description                                                                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Leave & Attendance Management** | Tracks employee attendance, manages leave entitlement, leave requests, leave balances, attendance exceptions, absence records, approval workflows, policy enforcement, payroll-ready attendance outcomes, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-LAM-001** | System shall maintain employee attendance records by employee, date, work calendar, and attendance status.                                                                                                              |
| **HRM-LAM-002** | System shall support attendance statuses including present, absent, late, early out, half-day, rest day, off day, public holiday, and missing punch.                                                                    |
| **HRM-LAM-003** | System shall maintain leave types such as annual leave, medical leave, unpaid leave, maternity leave, paternity leave, compassionate leave, emergency leave, study leave, replacement leave, and hospitalization leave. |
| **HRM-LAM-004** | System shall configure leave entitlement rules by legal entity, country, location, employee type, grade, tenure, and policy group.                                                                                      |
| **HRM-LAM-005** | System shall calculate employee leave entitlement based on configured policy rules.                                                                                                                                     |
| **HRM-LAM-006** | System shall maintain leave balances including opening, earned, used, pending, adjusted, forfeited, carried-forward, and remaining balance.                                                                             |
| **HRM-LAM-007** | System shall allow employees to submit leave applications.                                                                                                                                                              |
| **HRM-LAM-008** | System shall allow employees to attach supporting documents where required.                                                                                                                                             |
| **HRM-LAM-009** | System shall validate leave applications against available leave balance.                                                                                                                                               |
| **HRM-LAM-010** | System shall validate leave applications against leave eligibility rules.                                                                                                                                               |
| **HRM-LAM-011** | System shall validate leave applications against minimum notice period, maximum consecutive leave days, blackout dates, and overlapping leave.                                                                          |
| **HRM-LAM-012** | System shall route leave applications through approval workflow.                                                                                                                                                        |
| **HRM-LAM-013** | System shall support approval routing by manager, HR, department, leave type, duration, and employee grade.                                                                                                             |
| **HRM-LAM-014** | System shall allow approvers to approve, reject, return, or request clarification for leave applications.                                                                                                               |
| **HRM-LAM-015** | System shall require rejection reason for rejected leave applications.                                                                                                                                                  |
| **HRM-LAM-016** | System shall update leave balance after leave approval, cancellation, adjustment, or reversal.                                                                                                                          |
| **HRM-LAM-017** | System shall support leave cancellation and amendment based on policy.                                                                                                                                                  |
| **HRM-LAM-018** | System shall support manual leave balance adjustment with reason and authorization.                                                                                                                                     |
| **HRM-LAM-019** | System shall support leave carry-forward and forfeiture rules.                                                                                                                                                          |
| **HRM-LAM-020** | System shall track unpaid leave and expose payroll deduction reference to Payroll Processing.                                                                                                                           |
| **HRM-LAM-021** | System shall track medical leave with medical certificate reference where required.                                                                                                                                     |
| **HRM-LAM-022** | System shall detect attendance exceptions such as late arrival, early departure, absence, and missing punch.                                                                                                            |
| **HRM-LAM-023** | System shall allow attendance exception correction requests where enabled.                                                                                                                                              |
| **HRM-LAM-024** | System shall route attendance correction requests through approval workflow.                                                                                                                                            |
| **HRM-LAM-025** | System shall summarize attendance by employee, department, manager, legal entity, work location, and period.                                                                                                            |
| **HRM-LAM-026** | System shall expose approved leave, unpaid leave, absence, lateness, and attendance deduction references to Payroll Processing.                                                                                         |
| **HRM-LAM-027** | System shall restrict leave and attendance records based on employee, manager, HR, payroll, and auditor permissions.                                                                                                    |
| **HRM-LAM-028** | System shall notify employees and approvers of submitted, approved, rejected, cancelled, overdue, and returned leave or attendance requests.                                                                            |
| **HRM-LAM-029** | System shall provide leave and attendance reports by employee, department, leave type, attendance status, manager, location, legal entity, and period.                                                                  |
| **HRM-LAM-030** | System shall maintain audit trail for leave entitlement, leave application, approval, rejection, cancellation, adjustment, attendance correction, exception handling, and payroll integration.                          |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                          |
| --: | ---------------------------------------------------------------------------------------------------------------------------- |
|   1 | Employee attendance record can be maintained by employee and date.                                                           |
|   2 | Attendance status can show present, absent, late, early out, half-day, rest day, off day, holiday, or missing punch.         |
|   3 | Leave types can be configured by policy group.                                                                               |
|   4 | Leave entitlement can be calculated based on employee category, grade, tenure, location, legal entity, and country.          |
|   5 | Leave balance shows earned, used, pending, adjusted, carried-forward, forfeited, and remaining balance.                      |
|   6 | Employee can submit leave application online.                                                                                |
|   7 | Leave application validates available balance before submission or approval.                                                 |
|   8 | Leave application validates eligibility, minimum notice period, maximum duration, blackout dates, and overlapping leave.     |
|   9 | Supporting document is required when leave policy requires it.                                                               |
|  10 | Leave application follows configured approval workflow.                                                                      |
|  11 | Approver can approve, reject, return, or request clarification.                                                              |
|  12 | Rejected leave application stores rejection reason.                                                                          |
|  13 | Approved leave updates leave balance.                                                                                        |
|  14 | Leave cancellation or amendment updates leave balance correctly.                                                             |
|  15 | Manual leave balance adjustment requires authorization and reason.                                                           |
|  16 | Leave carry-forward and forfeiture can be processed according to policy.                                                     |
|  17 | Unpaid leave is exposed to Payroll Processing for deduction reference.                                                       |
|  18 | Attendance exceptions such as late, early out, absent, and missing punch are flagged.                                        |
|  19 | Attendance correction request can be submitted and approved where enabled.                                                   |
|  20 | Approved attendance and leave outcomes are available for payroll processing.                                                 |
|  21 | Employees can view their own leave balance, leave history, and attendance summary.                                           |
|  22 | Managers can view team leave calendar and attendance exceptions where authorized.                                            |
|  23 | Unauthorized users cannot view or modify restricted leave and attendance records.                                            |
|  24 | Leave and attendance reports can be generated by employee, department, leave type, status, location, and period.             |
|  25 | Every leave, attendance, correction, approval, rejection, adjustment, and payroll integration action creates an audit event. |
