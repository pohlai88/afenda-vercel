# Compliance & Regulatory Tracking

## Definition

**Compliance & Regulatory Tracking is the HRM function that monitors, records, and controls employee-related compliance obligations, including labor law requirements, workplace safety obligations, statutory employment rules, mandatory filings, work eligibility, policy compliance, and regulatory audit readiness.**

---

# Compliance & Regulatory Tracking Includes

| Area                                | What It Covers                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Labor Law Compliance**            | Employment rules, working hours, rest days, overtime limits, minimum wage references, termination rules |
| **Statutory Employment Compliance** | Required employee registrations, statutory contribution readiness, employment classification compliance |
| **Work Eligibility Tracking**       | Right-to-work status, work permit, visa, passport, foreign worker eligibility                           |
| **Workplace Safety Compliance**     | Safety training, incident reporting reference, safety certification, safety policy acknowledgment       |
| **Mandatory Filing Requirements**   | Government filings, statutory reports, employment declarations, regulatory submissions                  |
| **Policy Compliance**               | Code of conduct, employee handbook, anti-harassment policy, IT policy, safety policy acknowledgment     |
| **Document Compliance Status**      | Missing, expired, pending, verified, rejected, renewed compliance documents                             |
| **Training Compliance**             | Mandatory compliance training, safety training, certification expiry, refresher training requirement    |
| **Audit Readiness**                 | Compliance checklist, evidence reference, filing status, control status                                 |
| **Compliance Alerts**               | Expiring permits, missing filings, overdue training, missing acknowledgments                            |
| **Regulatory Calendar**             | Filing deadlines, renewal dates, statutory submission due dates                                         |
| **Exception Tracking**              | Non-compliance case, waiver, corrective action, escalation status                                       |
| **Corrective Action Tracking**      | Action owner, due date, completion status, evidence reference                                           |
| **Compliance Reporting**            | Compliance dashboard, exception report, expiry report, filing report                                    |
| **Compliance Audit Trail**          | Created by, reviewed by, approved by, submitted by, timestamp, evidence, reason                         |

---

# Compliance & Regulatory Tracking Does Not Include

| Excluded Area                             | Owned By                              |
| ----------------------------------------- | ------------------------------------- |
| Employee master profile                   | Employee Records Management           |
| Organization structure                    | Organizational Chart & Hierarchy      |
| Employee self-service portal              | Employee Self-Service Portal          |
| Document storage engine                   | Document Management                   |
| Employee lifecycle workflow               | Employee Lifecycle Management         |
| Payroll calculation                       | Payroll                               |
| Statutory contribution calculation        | Payroll                               |
| Leave application                         | Leave Management                      |
| Attendance clocking records               | Time & Attendance                     |
| Workplace incident investigation workflow | Health & Safety / Incident Management |
| Legal case management                     | Legal / Compliance Case Management    |
| Training course content creation          | Learning / Training Management        |
| Offboarding clearance workflow            | Offboarding & Exit Management         |
| Asset recovery                            | Asset Management / Offboarding        |

---

# Compliance & Regulatory Tracking Requirement Statement

| Requirement                          | Description                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Compliance & Regulatory Tracking** | Monitors and tracks employee-related compliance obligations, including labor law adherence, statutory employment requirements, workplace safety obligations, mandatory filings, work eligibility, policy acknowledgments, compliance documents, regulatory deadlines, exceptions, corrective actions, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **HRM-CMP-001** | System shall maintain HR compliance obligations by legal entity, country, location, employment type, and worker category.                  |
| **HRM-CMP-002** | System shall track labor law compliance requirements applicable to employees.                                                              |
| **HRM-CMP-003** | System shall track statutory employment compliance requirements.                                                                           |
| **HRM-CMP-004** | System shall track employee work eligibility status.                                                                                       |
| **HRM-CMP-005** | System shall track work permit, visa, passport, and right-to-work document status.                                                         |
| **HRM-CMP-006** | System shall track workplace safety compliance requirements.                                                                               |
| **HRM-CMP-007** | System shall track mandatory safety training and certification requirements.                                                               |
| **HRM-CMP-008** | System shall track mandatory HR policy acknowledgments.                                                                                    |
| **HRM-CMP-009** | System shall track mandatory filing requirements and filing deadlines.                                                                     |
| **HRM-CMP-010** | System shall maintain a regulatory calendar for HR compliance deadlines.                                                                   |
| **HRM-CMP-011** | System shall flag missing compliance documents.                                                                                            |
| **HRM-CMP-012** | System shall flag expired or expiring compliance documents.                                                                                |
| **HRM-CMP-013** | System shall flag overdue compliance training.                                                                                             |
| **HRM-CMP-014** | System shall flag missing mandatory policy acknowledgments.                                                                                |
| **HRM-CMP-015** | System shall classify compliance status as compliant, pending, at risk, overdue, expired, waived, or non-compliant.                        |
| **HRM-CMP-016** | System shall generate alerts for compliance deadlines, renewals, expiries, and overdue actions.                                            |
| **HRM-CMP-017** | System shall create compliance exceptions for missing, expired, overdue, or failed compliance items.                                       |
| **HRM-CMP-018** | System shall assign corrective action owners and due dates.                                                                                |
| **HRM-CMP-019** | System shall track corrective action progress and completion.                                                                              |
| **HRM-CMP-020** | System shall link compliance records to supporting evidence documents.                                                                     |
| **HRM-CMP-021** | System shall support compliance review and approval workflow where required.                                                               |
| **HRM-CMP-022** | System shall provide compliance dashboards by legal entity, department, location, employee category, and risk status.                      |
| **HRM-CMP-023** | System shall provide compliance reports for filings, expiries, exceptions, training, acknowledgments, and work eligibility.                |
| **HRM-CMP-024** | System shall restrict access to sensitive compliance records based on role and authorization.                                              |
| **HRM-CMP-025** | System shall maintain audit trail for compliance checks, alerts, exceptions, filings, reviews, approvals, waivers, and corrective actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                |
| --: | ------------------------------------------------------------------------------------------------------------------ |
|   1 | Compliance obligations can be configured by legal entity, country, location, employment type, and worker category. |
|   2 | Employee compliance status can be viewed from a central compliance dashboard.                                      |
|   3 | Work eligibility status can be tracked for applicable employees.                                                   |
|   4 | Work permit, visa, passport, and right-to-work expiry dates can be tracked.                                        |
|   5 | Missing compliance documents are flagged.                                                                          |
|   6 | Expiring compliance documents generate alerts before expiry.                                                       |
|   7 | Expired compliance documents are clearly marked as non-compliant or expired.                                       |
|   8 | Mandatory filing deadlines can be recorded and monitored.                                                          |
|   9 | Overdue mandatory filings are flagged.                                                                             |
|  10 | Mandatory policy acknowledgments can be tracked by employee and policy version.                                    |
|  11 | Missing policy acknowledgments are flagged.                                                                        |
|  12 | Mandatory safety or compliance training can be tracked.                                                            |
|  13 | Overdue compliance training is flagged.                                                                            |
|  14 | Compliance exceptions can be created for non-compliant items.                                                      |
|  15 | Corrective action owner, due date, and status can be assigned.                                                     |
|  16 | Compliance evidence can be linked to document records.                                                             |
|  17 | Compliance status can be filtered by company, department, location, employee category, and risk level.             |
|  18 | Sensitive compliance records are hidden from unauthorized users.                                                   |
|  19 | Compliance reports can be exported by authorized users.                                                            |
|  20 | Every compliance status change, filing update, exception, waiver, and corrective action creates an audit event.    |
