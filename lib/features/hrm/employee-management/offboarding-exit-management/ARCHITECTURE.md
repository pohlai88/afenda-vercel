# Offboarding & Exit Management

## Definition

**Offboarding & Exit Management is the HRM function that controls, tracks, and automates the employee exit process, including resignation, termination, retirement, contract end, exit clearance, exit interview, asset recovery, access revocation, knowledge handover, final payroll settlement reference, and post-employment record closure.**

---

# Offboarding & Exit Management Includes

| Area                               | What It Covers                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| **Exit Initiation**                | Resignation, termination, retirement, contract expiry, mutual separation               |
| **Exit Reason Tracking**           | Resignation reason, termination reason, retirement reason, contract-end reason         |
| **Notice Period Tracking**         | Notice start date, notice end date, required notice days, waived notice, short notice  |
| **Last Working Date**              | Final working day, effective separation date, adjusted last day                        |
| **Exit Approval Workflow**         | Manager approval, HR approval, management approval, legal review where required        |
| **Exit Checklist**                 | HR tasks, manager tasks, employee tasks, IT tasks, finance tasks, admin tasks          |
| **Exit Interview**                 | Exit interview scheduling, questionnaire, feedback, interview outcome                  |
| **Handover Management**            | Work handover, project handover, customer handover, document handover                  |
| **Asset Recovery**                 | Laptop, phone, access card, uniform, vehicle, tools, company property                  |
| **Access Revocation**              | System access, email access, building access, application access, badge access         |
| **Document Completion**            | Resignation letter, clearance form, release letter, experience letter, exit documents  |
| **Leave / Attendance Clearance**   | Outstanding leave, attendance correction, absence check, overtime reference            |
| **Claims / Advance Clearance**     | Outstanding claims, cash advance, reimbursement, employee debt reference               |
| **Final Settlement Reference**     | Final salary, unused leave payout, deductions, statutory payments, severance reference |
| **Replacement / Vacancy Trigger**  | Position vacancy update, replacement request, workforce planning reference             |
| **Post-Employment Record Closure** | Employee status update, record archive, retention rule, rehire eligibility             |
| **Audit Trail**                    | Submitted by, approved by, cleared by, revoked by, recovered by, timestamp, evidence   |

---

# Offboarding & Exit Management Does Not Include

| Excluded Area                      | Owned By                         |
| ---------------------------------- | -------------------------------- |
| Employee master profile            | Employee Records Management      |
| Employee lifecycle stage tracking  | Employee Lifecycle Management    |
| Organization hierarchy             | Organizational Chart & Hierarchy |
| Employee document storage engine   | Document Management              |
| Employee self-service portal       | Employee Self-Service Portal     |
| Payroll calculation                | Payroll                          |
| Final payroll computation          | Payroll                          |
| Statutory contribution calculation | Payroll                          |
| Leave balance calculation          | Leave Management                 |
| Attendance record ownership        | Time & Attendance                |
| Asset inventory master             | Asset Management                 |
| User account provisioning rules    | IAM / Access Control             |
| Legal dispute handling             | Legal / Compliance               |
| Recruitment replacement process    | Recruitment Management           |
| Performance review records         | Performance Management           |

---

# Offboarding & Exit Management Requirement Statement

| Requirement                       | Description                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Offboarding & Exit Management** | Automates and controls employee exit processes, including resignation, termination, retirement, contract end, notice period tracking, exit approvals, exit checklist, exit interview, handover, asset recovery, access revocation, clearance, final settlement reference, employee status update, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-OFF-001** | System shall allow authorized users or employees to initiate an offboarding process.                                                                                |
| **HRM-OFF-002** | System shall support exit types including resignation, termination, retirement, contract expiry, redundancy, death, and mutual separation.                          |
| **HRM-OFF-003** | System shall capture exit reason, effective date, notice start date, notice end date, and last working date.                                                        |
| **HRM-OFF-004** | System shall calculate or validate notice period based on employment terms or policy reference.                                                                     |
| **HRM-OFF-005** | System shall support exit approval workflow based on exit type, employee grade, legal entity, department, and risk level.                                           |
| **HRM-OFF-006** | System shall generate offboarding checklist tasks automatically.                                                                                                    |
| **HRM-OFF-007** | System shall assign offboarding tasks to HR, manager, employee, IT, finance, payroll, admin, and asset owners.                                                      |
| **HRM-OFF-008** | System shall track completion status of every offboarding checklist item.                                                                                           |
| **HRM-OFF-009** | System shall support exit interview scheduling.                                                                                                                     |
| **HRM-OFF-010** | System shall support exit interview questionnaire and feedback capture.                                                                                             |
| **HRM-OFF-011** | System shall support work handover checklist and handover evidence.                                                                                                 |
| **HRM-OFF-012** | System shall track company asset recovery status.                                                                                                                   |
| **HRM-OFF-013** | System shall identify outstanding assets assigned to the employee.                                                                                                  |
| **HRM-OFF-014** | System shall track returned, damaged, missing, waived, or deducted asset status.                                                                                    |
| **HRM-OFF-015** | System shall trigger access revocation tasks for IT and security teams.                                                                                             |
| **HRM-OFF-016** | System shall track access revocation status for systems, email, physical access, applications, and devices.                                                         |
| **HRM-OFF-017** | System shall check outstanding leave, attendance, claims, advances, loans, deductions, and company property before clearance.                                       |
| **HRM-OFF-018** | System shall expose final settlement readiness to Payroll.                                                                                                          |
| **HRM-OFF-019** | System shall allow Payroll to return final settlement blockers to the offboarding checklist.                                                                        |
| **HRM-OFF-020** | System shall generate or link exit documents such as clearance form, acceptance of resignation, termination letter, release letter, and experience letter.          |
| **HRM-OFF-021** | System shall update employee employment status after offboarding completion.                                                                                        |
| **HRM-OFF-022** | System shall trigger position vacancy or replacement request where applicable.                                                                                      |
| **HRM-OFF-023** | System shall support rehire eligibility classification.                                                                                                             |
| **HRM-OFF-024** | System shall preserve offboarding history after employee separation.                                                                                                |
| **HRM-OFF-025** | System shall restrict sensitive exit information based on role and authorization.                                                                                   |
| **HRM-OFF-026** | System shall provide offboarding dashboard by status, exit type, department, manager, legal entity, and last working date.                                          |
| **HRM-OFF-027** | System shall send notifications for pending, overdue, blocked, and completed offboarding tasks.                                                                     |
| **HRM-OFF-028** | System shall maintain audit trail for offboarding initiation, approval, rejection, clearance, asset recovery, access revocation, settlement readiness, and closure. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                |
| --: | ------------------------------------------------------------------------------------------------------------------ |
|   1 | Offboarding process can be initiated for resignation, termination, retirement, or contract end.                    |
|   2 | Exit reason, notice period, effective separation date, and last working date can be recorded.                      |
|   3 | Exit approval workflow is triggered based on exit type and employee profile.                                       |
|   4 | Offboarding checklist is automatically generated.                                                                  |
|   5 | Checklist tasks can be assigned to HR, manager, employee, IT, finance, payroll, admin, and asset owners.           |
|   6 | Each checklist task has owner, due date, status, and completion evidence.                                          |
|   7 | Exit interview can be scheduled and recorded.                                                                      |
|   8 | Exit interview feedback can be captured.                                                                           |
|   9 | Work handover tasks can be tracked.                                                                                |
|  10 | Outstanding company assets assigned to the employee are visible.                                                   |
|  11 | Asset recovery status can be marked as returned, damaged, missing, waived, or deducted.                            |
|  12 | Access revocation tasks are created for relevant systems and physical access.                                      |
|  13 | Access revocation status can be tracked.                                                                           |
|  14 | Outstanding leave, attendance, claims, advances, loans, deductions, and assets are checked before final clearance. |
|  15 | Final settlement readiness is exposed to Payroll.                                                                  |
|  16 | Final settlement calculation remains owned by Payroll.                                                             |
|  17 | Exit documents can be generated or linked.                                                                         |
|  18 | Employee status is updated after offboarding completion.                                                           |
|  19 | Position vacancy or replacement request can be triggered where applicable.                                         |
|  20 | Rehire eligibility can be recorded.                                                                                |
|  21 | Separated employee records remain historically available according to retention policy.                            |
|  22 | Sensitive exit information is hidden from unauthorized users.                                                      |
|  23 | Overdue offboarding tasks generate alerts.                                                                         |
|  24 | Every offboarding action creates an audit event.                                                                   |
