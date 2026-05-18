# Shift Scheduling

## Definition

**Shift Scheduling is the HRM function that creates, assigns, manages, and controls employee shift patterns, shift rotations, work rosters, rest days, off days, shift swaps, schedule changes, staffing coverage, and schedule compliance.**

---

# Shift Scheduling Includes

| Area                          | What It Covers                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| **Shift Pattern Management**  | Morning shift, afternoon shift, night shift, split shift, rotating shift, fixed shift |
| **Roster Planning**           | Weekly roster, monthly roster, department roster, team roster, location roster        |
| **Shift Assignment**          | Assign employees to shifts by date, team, location, role, or department               |
| **Shift Rotation**            | Rotating schedules, alternating shifts, cycle-based shifts, rolling rosters           |
| **Rest Day Scheduling**       | Rest day, off day, weekend, replacement rest day                                      |
| **Public Holiday Scheduling** | Holiday shift, holiday coverage, replacement day reference                            |
| **Shift Swap Request**        | Employee swap request, manager approval, replacement employee validation              |
| **Schedule Change Request**   | Shift change, off-day change, emergency schedule change                               |
| **Coverage Planning**         | Required headcount, assigned headcount, shortage, overstaffing                        |
| **Skill / Role Coverage**     | Required role, required skill, certification requirement, minimum staffing level      |
| **Availability Tracking**     | Employee availability, unavailable dates, preferred shift, blocked dates              |
| **Conflict Detection**        | Overlapping shifts, insufficient rest, double booking, leave conflict                 |
| **Schedule Compliance**       | Rest-hour rule, maximum workday rule, maximum weekly hours, labor policy reference    |
| **Attendance Integration**    | Scheduled shift compared with actual attendance                                       |
| **Overtime Reference**        | Planned overtime, excess hours, schedule-driven overtime reference                    |
| **Payroll Reference**         | Shift allowance, night shift premium, holiday premium, rest day work reference        |
| **Notification**              | Published schedule, shift change alert, swap approval alert                           |
| **Audit Trail**               | Created by, assigned by, changed by, approved by, swapped by, timestamp, reason       |

---

# Shift Scheduling Does Not Include

| Excluded Area                       | Owned By                                               |
| ----------------------------------- | ------------------------------------------------------ |
| Employee master profile             | Employee Records Management                            |
| Organization hierarchy              | Organizational Chart & Hierarchy                       |
| Leave application workflow          | Leave & Attendance Management                          |
| Attendance clock-in/out records     | Time Clock Integration / Leave & Attendance Management |
| Overtime approval and calculation   | Overtime Management                                    |
| Payroll calculation                 | Payroll Processing                                     |
| Shift allowance payment calculation | Payroll Processing                                     |
| GPS clock-in verification           | Geolocation & Remote Check-In                          |
| Absence trend analytics             | Absence Analytics & Trends                             |
| Flexible work policy tracking       | Flexible Work Arrangement Tracking                     |
| Workforce demand forecasting        | Workforce Planning                                     |
| Compliance rule ownership           | Compliance & Regulatory Tracking                       |
| Employment contract management      | Document Management / Employee Records                 |

---

# Shift Scheduling Requirement Statement

| Requirement          | Description                                                                                                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shift Scheduling** | Creates and manages employee shift patterns, rotations, rosters, rest days, shift assignments, swap requests, coverage requirements, schedule conflicts, compliance rules, schedule notifications, attendance references, payroll references, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-SFT-001** | System shall create and maintain shift types.                                                                                                                                      |
| **HRM-SFT-002** | System shall define shift start time, end time, break time, working hours, and shift category.                                                                                     |
| **HRM-SFT-003** | System shall support fixed, rotating, split, night, weekend, holiday, and flexible shift patterns.                                                                                 |
| **HRM-SFT-004** | System shall create employee rosters by date range, department, team, location, role, or legal entity.                                                                             |
| **HRM-SFT-005** | System shall assign employees to shifts.                                                                                                                                           |
| **HRM-SFT-006** | System shall support bulk shift assignment.                                                                                                                                        |
| **HRM-SFT-007** | System shall support recurring shift schedules.                                                                                                                                    |
| **HRM-SFT-008** | System shall support rotating shift cycles.                                                                                                                                        |
| **HRM-SFT-009** | System shall assign rest days and off days.                                                                                                                                        |
| **HRM-SFT-010** | System shall support holiday shift scheduling.                                                                                                                                     |
| **HRM-SFT-011** | System shall validate employee availability before shift assignment.                                                                                                               |
| **HRM-SFT-012** | System shall detect conflict with approved leave.                                                                                                                                  |
| **HRM-SFT-013** | System shall detect overlapping shift assignments.                                                                                                                                 |
| **HRM-SFT-014** | System shall detect insufficient rest period between shifts.                                                                                                                       |
| **HRM-SFT-015** | System shall detect excessive scheduled working hours based on policy.                                                                                                             |
| **HRM-SFT-016** | System shall support minimum staffing requirements by shift, role, team, location, and date.                                                                                       |
| **HRM-SFT-017** | System shall flag understaffed or overstaffed shifts.                                                                                                                              |
| **HRM-SFT-018** | System shall support required skill, certification, or role coverage for shifts.                                                                                                   |
| **HRM-SFT-019** | System shall allow employees to request shift swaps where enabled.                                                                                                                 |
| **HRM-SFT-020** | System shall validate shift swap eligibility.                                                                                                                                      |
| **HRM-SFT-021** | System shall route shift swap requests through approval workflow.                                                                                                                  |
| **HRM-SFT-022** | System shall allow managers to approve, reject, return, or override shift swap requests.                                                                                           |
| **HRM-SFT-023** | System shall require reason for rejected or overridden shift changes.                                                                                                              |
| **HRM-SFT-024** | System shall support manager-initiated schedule changes.                                                                                                                           |
| **HRM-SFT-025** | System shall notify employees when schedules are published or changed.                                                                                                             |
| **HRM-SFT-026** | System shall compare scheduled shift with actual attendance records.                                                                                                               |
| **HRM-SFT-027** | System shall expose planned overtime, shift premium, rest day work, and holiday work references to Payroll Processing.                                                             |
| **HRM-SFT-028** | System shall provide shift schedule reports by employee, department, team, manager, location, role, and period.                                                                    |
| **HRM-SFT-029** | System shall restrict shift schedule creation, changes, approvals, and overrides based on role and authorization.                                                                  |
| **HRM-SFT-030** | System shall maintain audit trail for shift creation, assignment, roster publication, schedule change, swap request, approval, rejection, override, and payroll reference actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                          |
| --: | -------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Shift type can be created with start time, end time, break time, working hours, and shift category.                                          |
|   2 | Fixed, rotating, split, night, weekend, holiday, and flexible shifts can be configured.                                                      |
|   3 | Employees can be assigned to shifts by date, department, team, location, or role.                                                            |
|   4 | Bulk shift assignment can be performed by authorized users.                                                                                  |
|   5 | Recurring shift schedules can be generated.                                                                                                  |
|   6 | Rotating shift cycles can be created and assigned.                                                                                           |
|   7 | Rest days and off days can be scheduled.                                                                                                     |
|   8 | Holiday shifts can be scheduled where required.                                                                                              |
|   9 | System flags shift assignment conflicts with approved leave.                                                                                 |
|  10 | System flags overlapping shift assignments.                                                                                                  |
|  11 | System flags insufficient rest period between shifts.                                                                                        |
|  12 | System flags excessive scheduled working hours based on policy.                                                                              |
|  13 | Minimum staffing requirements can be defined by shift, role, location, and date.                                                             |
|  14 | Understaffed or overstaffed shifts are clearly flagged.                                                                                      |
|  15 | Required skill, certification, or role coverage can be validated for assigned employees.                                                     |
|  16 | Employee can request shift swap where policy allows.                                                                                         |
|  17 | Shift swap eligibility is validated before approval.                                                                                         |
|  18 | Shift swap request follows approval workflow.                                                                                                |
|  19 | Manager can approve, reject, return, or override shift swap request where authorized.                                                        |
|  20 | Rejected or overridden shift change stores reason.                                                                                           |
|  21 | Employees are notified when schedule is published or changed.                                                                                |
|  22 | Scheduled shift can be compared with actual attendance.                                                                                      |
|  23 | Planned overtime, shift premium, rest day work, and holiday work references are available for Payroll Processing.                            |
|  24 | Shift schedule reports can be generated by employee, department, team, manager, location, role, and period.                                  |
|  25 | Unauthorized users cannot create, modify, approve, or override shift schedules.                                                              |
|  26 | Every shift creation, assignment, schedule change, swap, approval, rejection, override, and payroll reference action creates an audit event. |
