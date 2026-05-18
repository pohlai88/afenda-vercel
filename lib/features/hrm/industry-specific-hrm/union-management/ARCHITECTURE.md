# Union & Collective Bargaining Management

## Definition

**Union & Collective Bargaining Management is the HRM function that tracks union membership, manages collective bargaining agreements, applies seniority-based employment rules, supports grievance handling, monitors union-related obligations, and maintains labor-relations compliance records.**

---

# Union & Collective Bargaining Management Includes

| Area                                 | What It Covers                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Union Membership Tracking**        | Union membership status, union name, membership effective date, membership end date         |
| **Bargaining Unit Assignment**       | Bargaining unit, employee group, covered role, covered department, covered location         |
| **Collective Bargaining Agreement**  | Agreement title, agreement period, applicable workforce, terms, clauses, renewal date       |
| **CBA Rule Management**              | Pay rules, overtime rules, leave rules, working-hour rules, allowance rules, rest-day rules |
| **Seniority Rules**                  | Seniority date, service length, ranking, priority rule, tie-break rule                      |
| **Seniority-Based Decisions**        | Shift preference, overtime priority, layoff order, recall order, promotion consideration    |
| **Union Dues Reference**             | Deduction eligibility, dues amount reference, payroll deduction reference                   |
| **Grievance Process**                | Grievance submission, grievance category, step level, hearing date, decision, escalation    |
| **Dispute Tracking**                 | Labor dispute, complaint, unresolved issue, mediation reference, arbitration reference      |
| **CBA Compliance Monitoring**        | Rule breach, missed deadline, non-compliant assignment, agreement exception                 |
| **Union Representative Management**  | Union rep, steward, representative role, assigned department/site                           |
| **Labor Relations Meetings**         | Meeting schedule, minutes reference, participants, action items                             |
| **Agreement Renewal Tracking**       | Expiry date, negotiation status, renewal reminder, new agreement version                    |
| **Employee Communication Reference** | Notice, announcement, agreement update, policy communication                                |
| **Reporting**                        | Union membership report, grievance report, CBA compliance report, seniority report          |
| **Audit Trail**                      | Created by, updated by, approved by, reviewed by, escalated by, timestamp, reason           |

---

# Union & Collective Bargaining Management Does Not Include

| Excluded Area                    | Owned By                         |
| -------------------------------- | -------------------------------- |
| Employee master profile          | Employee Records Management      |
| Organization hierarchy           | Organizational Chart & Hierarchy |
| Payroll calculation              | Payroll Processing               |
| Payroll run finalization         | Payroll Processing               |
| Leave application workflow       | Leave & Attendance Management    |
| Overtime calculation engine      | Overtime Management              |
| Shift schedule creation          | Shift Scheduling                 |
| Performance appraisal scoring    | Performance Appraisals           |
| Compensation planning            | Compensation Planning & Modeling |
| Recruitment pipeline             | Recruitment & Applicant Tracking |
| Legal case litigation            | Legal / External Counsel         |
| Document storage engine          | Document Management              |
| General HR policy library        | HR Policy Management             |
| Workplace incident investigation | Health & Safety / Compliance     |
| Employee disciplinary workflow   | Employee Relations / Compliance  |

---

# Union & Collective Bargaining Management Requirement Statement

| Requirement                                  | Description                                                                                                                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Union & Collective Bargaining Management** | Tracks union membership, bargaining unit assignment, collective bargaining agreements, CBA rules, seniority-based rules, grievance processes, dispute references, union dues references, labor-relations meetings, agreement renewals, compliance monitoring, reporting, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-UCB-001** | System shall maintain union records.                                                                                                                                                                                                            |
| **HRM-UCB-002** | System shall maintain collective bargaining agreement records.                                                                                                                                                                                  |
| **HRM-UCB-003** | System shall track agreement title, agreement version, effective date, expiry date, status, and applicable workforce.                                                                                                                           |
| **HRM-UCB-004** | System shall assign employees to bargaining units where applicable.                                                                                                                                                                             |
| **HRM-UCB-005** | System shall track employee union membership status.                                                                                                                                                                                            |
| **HRM-UCB-006** | System shall track membership start date, end date, union reference, and bargaining unit reference.                                                                                                                                             |
| **HRM-UCB-007** | System shall restrict access to union membership data based on role and authorization.                                                                                                                                                          |
| **HRM-UCB-008** | System shall maintain CBA rule references for pay, overtime, leave, work hours, rest days, holidays, allowances, and benefits.                                                                                                                  |
| **HRM-UCB-009** | System shall expose CBA pay and deduction references to Payroll Processing.                                                                                                                                                                     |
| **HRM-UCB-010** | System shall expose CBA overtime rule references to Overtime Management.                                                                                                                                                                        |
| **HRM-UCB-011** | System shall expose CBA leave and attendance rule references to Leave & Attendance Management.                                                                                                                                                  |
| **HRM-UCB-012** | System shall expose CBA scheduling rule references to Shift Scheduling.                                                                                                                                                                         |
| **HRM-UCB-013** | System shall maintain seniority date for employees covered by seniority rules.                                                                                                                                                                  |
| **HRM-UCB-014** | System shall calculate or reference seniority ranking by bargaining unit, role, department, location, or agreement.                                                                                                                             |
| **HRM-UCB-015** | System shall support seniority-based rules for shift preference, overtime priority, layoff order, recall order, vacation bidding, and promotion consideration.                                                                                  |
| **HRM-UCB-016** | System shall flag actions that conflict with applicable CBA or seniority rules.                                                                                                                                                                 |
| **HRM-UCB-017** | System shall support union dues deduction references.                                                                                                                                                                                           |
| **HRM-UCB-018** | System shall expose approved union dues deduction references to Payroll Processing.                                                                                                                                                             |
| **HRM-UCB-019** | System shall support grievance case creation.                                                                                                                                                                                                   |
| **HRM-UCB-020** | System shall classify grievances by category, agreement clause, employee, department, location, and severity.                                                                                                                                   |
| **HRM-UCB-021** | System shall support grievance process steps, deadlines, meetings, decisions, and escalation levels.                                                                                                                                            |
| **HRM-UCB-022** | System shall track grievance status including submitted, under review, meeting scheduled, pending decision, escalated, resolved, withdrawn, and closed.                                                                                         |
| **HRM-UCB-023** | System shall support mediation, arbitration, or legal reference where applicable.                                                                                                                                                               |
| **HRM-UCB-024** | System shall maintain union representative or steward records.                                                                                                                                                                                  |
| **HRM-UCB-025** | System shall support labor-relations meeting records, participants, minutes reference, and action items.                                                                                                                                        |
| **HRM-UCB-026** | System shall track CBA renewal dates and negotiation status.                                                                                                                                                                                    |
| **HRM-UCB-027** | System shall generate alerts for expiring agreements, grievance deadlines, unresolved disputes, and overdue labor-relations actions.                                                                                                            |
| **HRM-UCB-028** | System shall provide reports for union membership, bargaining units, CBA coverage, seniority ranking, grievances, disputes, dues references, and agreement renewals.                                                                            |
| **HRM-UCB-029** | System shall restrict union, grievance, dispute, and labor-relations records based on HR, labor-relations, manager, legal, payroll, auditor, and executive permissions.                                                                         |
| **HRM-UCB-030** | System shall maintain audit trail for union setup, membership update, bargaining unit assignment, CBA setup, rule reference change, grievance action, dispute escalation, seniority update, dues reference, renewal, and report export actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                                                                                              |
| --: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Union record can be created with name, code, status, and representative reference.                                                                                                                               |
|   2 | Collective bargaining agreement can be created with title, version, effective date, expiry date, status, and applicable workforce.                                                                               |
|   3 | Employee can be assigned to bargaining unit where applicable.                                                                                                                                                    |
|   4 | Employee union membership status can be recorded.                                                                                                                                                                |
|   5 | Membership start date, end date, union reference, and bargaining unit reference can be tracked.                                                                                                                  |
|   6 | Union membership data is hidden from unauthorized users.                                                                                                                                                         |
|   7 | CBA rules can be referenced for pay, overtime, leave, work hours, rest days, holidays, allowances, and benefits.                                                                                                 |
|   8 | CBA rule references are available to Payroll Processing, Overtime Management, Leave & Attendance Management, and Shift Scheduling where required.                                                                |
|   9 | Seniority date can be maintained for covered employees.                                                                                                                                                          |
|  10 | Seniority ranking can be calculated or referenced by bargaining unit, role, department, location, or agreement.                                                                                                  |
|  11 | Seniority-based rules can support shift preference, overtime priority, layoff order, recall order, vacation bidding, and promotion consideration.                                                                |
|  12 | System flags actions that conflict with applicable CBA or seniority rules.                                                                                                                                       |
|  13 | Union dues deduction reference can be maintained.                                                                                                                                                                |
|  14 | Approved union dues deduction reference can be sent to Payroll Processing.                                                                                                                                       |
|  15 | Grievance case can be created and linked to employee, department, bargaining unit, and agreement clause.                                                                                                         |
|  16 | Grievance process can track step level, deadline, meeting, decision, and escalation.                                                                                                                             |
|  17 | Grievance status can be tracked from submitted to closed.                                                                                                                                                        |
|  18 | Mediation, arbitration, or legal reference can be recorded where applicable.                                                                                                                                     |
|  19 | Union representative or steward record can be maintained.                                                                                                                                                        |
|  20 | Labor-relations meeting can store participants, minutes reference, and action items.                                                                                                                             |
|  21 | CBA expiry and negotiation status can be tracked.                                                                                                                                                                |
|  22 | Expiring agreements, grievance deadlines, unresolved disputes, and overdue actions generate alerts.                                                                                                              |
|  23 | Reports can be generated for union membership, bargaining units, CBA coverage, seniority, grievances, disputes, dues references, and renewals.                                                                   |
|  24 | Unauthorized users cannot view or modify restricted union, grievance, dispute, or labor-relations records.                                                                                                       |
|  25 | Every union setup, membership update, bargaining unit assignment, CBA rule reference, grievance action, dispute escalation, seniority update, dues reference, renewal, and report export creates an audit event. |
