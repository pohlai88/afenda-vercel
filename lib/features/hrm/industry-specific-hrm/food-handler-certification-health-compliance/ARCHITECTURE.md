# Food Handler Certification & Health Compliance

## Definition

**Food Handler Certification & Health Compliance is the HRM function that tracks food service employee permits, food handler certificates, health declarations, medical fitness requirements, allergen training, hygiene training, renewal deadlines, compliance status, and audit evidence required for safe food handling operations.**

---

# Food Handler Certification & Health Compliance Includes

| Area                                | What It Covers                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| **Food Handler Permit Tracking**    | Food handler card, permit number, issuing authority, issue date, expiry date             |
| **Health Certification**            | Medical fitness certificate, health screening reference, clinic/provider reference       |
| **Food Safety Training**            | Food hygiene course, safe food handling training, contamination prevention training      |
| **Allergen Training**               | Allergen awareness, allergen handling, cross-contact prevention, menu allergen knowledge |
| **Role-Based Compliance**           | Cook, kitchen helper, server, barista, food packer, supervisor, delivery food handler    |
| **Location-Based Compliance**       | Restaurant, central kitchen, food truck, cafeteria, catering site, production kitchen    |
| **Certification Requirement Rules** | Required certification by role, outlet, country, location, employment type               |
| **Renewal Tracking**                | Renewal due date, expiry alert, renewal submission, renewed certification                |
| **Document Evidence**               | Certificate document, permit document, training proof, medical certificate reference     |
| **Compliance Status**               | Compliant, pending, expiring, expired, missing, rejected, waived                         |
| **Work Eligibility Control**        | Restrict food handling duties when certification is missing or expired                   |
| **Training Completion Tracking**    | Required training assigned, completed, overdue, failed, renewed                          |
| **Audit Readiness**                 | Inspection evidence, certification register, outlet compliance report                    |
| **Manager / HR Alerts**             | Expiring permits, overdue training, missing health certification                         |
| **Corrective Action Reference**     | Re-training, certificate renewal, temporary duty restriction, manager review             |
| **Reporting**                       | Food handler compliance report, outlet readiness report, expiry report, training report  |
| **Audit Trail**                     | Uploaded by, verified by, renewed by, rejected by, reviewed by, timestamp, reason        |

---

# Food Handler Certification & Health Compliance Does Not Include

| Excluded Area                         | Owned By                               |
| ------------------------------------- | -------------------------------------- |
| Employee master profile               | Employee Records Management            |
| Employee document storage engine      | Document Management                    |
| General compliance rule library       | Compliance & Regulatory Tracking       |
| Course delivery                       | Learning Management System             |
| Training program administration       | Training & Development                 |
| Shift scheduling                      | Shift Scheduling                       |
| Attendance tracking                   | Leave & Attendance Management          |
| Payroll calculation                   | Payroll Processing                     |
| Restaurant operation checklist        | Operations / Quality Management        |
| Food safety incident investigation    | Health & Safety / Quality / Compliance |
| Customer complaint handling           | CRM / Quality Management               |
| Supplier food safety compliance       | Procurement / Supplier Management      |
| Kitchen equipment sanitation tracking | Operations / Asset Management          |
| Government filing submission          | Compliance & Regulatory Tracking       |

---

# Food Handler Certification & Health Compliance Requirement Statement

| Requirement                                        | Description                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Food Handler Certification & Health Compliance** | Tracks food handler permits, health certifications, food hygiene training, allergen training, certification expiry, renewal status, role-based compliance requirements, work eligibility restrictions, document evidence, compliance alerts, reporting, and audit history for food service employees. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-FHC-001** | System shall maintain food handler certification requirements by country, legal entity, outlet, role, department, and employee category.                                          |
| **HRM-FHC-002** | System shall identify employees who require food handler certification.                                                                                                           |
| **HRM-FHC-003** | System shall track food handler permit number, issuing authority, issue date, expiry date, and status.                                                                            |
| **HRM-FHC-004** | System shall track food hygiene or safe food handling training completion.                                                                                                        |
| **HRM-FHC-005** | System shall track allergen awareness training completion where required.                                                                                                         |
| **HRM-FHC-006** | System shall track health certification or medical fitness certificate where required.                                                                                            |
| **HRM-FHC-007** | System shall link food handler certificates, health certificates, and training evidence to Document Management.                                                                   |
| **HRM-FHC-008** | System shall classify certification status as compliant, pending, missing, expiring, expired, rejected, waived, or not required.                                                  |
| **HRM-FHC-009** | System shall validate whether an employee is eligible to perform food handling duties.                                                                                            |
| **HRM-FHC-010** | System shall flag employees assigned to food handling roles without required certification.                                                                                       |
| **HRM-FHC-011** | System shall flag expired food handler permits.                                                                                                                                   |
| **HRM-FHC-012** | System shall flag missing health certification where required.                                                                                                                    |
| **HRM-FHC-013** | System shall flag overdue food safety or allergen training.                                                                                                                       |
| **HRM-FHC-014** | System shall generate alerts before food handler permit or health certificate expiry.                                                                                             |
| **HRM-FHC-015** | System shall support renewal tracking for expiring certificates and permits.                                                                                                      |
| **HRM-FHC-016** | System shall allow authorized HR, compliance, or outlet managers to verify submitted certification evidence.                                                                      |
| **HRM-FHC-017** | System shall require rejection reason when certification evidence is rejected.                                                                                                    |
| **HRM-FHC-018** | System shall support temporary duty restriction when certification or health compliance is expired, missing, or rejected.                                                         |
| **HRM-FHC-019** | System shall expose food handling eligibility status to Shift Scheduling where required.                                                                                          |
| **HRM-FHC-020** | System shall expose mandatory training completion status to Compliance & Regulatory Tracking.                                                                                     |
| **HRM-FHC-021** | System shall expose learning requirements to LMS or Training & Development.                                                                                                       |
| **HRM-FHC-022** | System shall provide food handler compliance dashboard by outlet, role, department, manager, legal entity, and status.                                                            |
| **HRM-FHC-023** | System shall provide reports for expired permits, expiring permits, missing certifications, overdue training, and outlet compliance readiness.                                    |
| **HRM-FHC-024** | System shall restrict health certification and medical-related records based on role and authorization.                                                                           |
| **HRM-FHC-025** | System shall maintain audit trail for requirement setup, certificate submission, verification, rejection, renewal, expiry alert, duty restriction, and compliance review actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                                              |
| --: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Food handler certification requirement can be configured by country, outlet, role, department, and employee category.                                            |
|   2 | Employees requiring food handler certification are automatically identified based on role or assignment.                                                         |
|   3 | Food handler permit can store permit number, issuing authority, issue date, expiry date, and status.                                                             |
|   4 | Food hygiene training completion can be tracked.                                                                                                                 |
|   5 | Allergen training completion can be tracked where required.                                                                                                      |
|   6 | Health certification or medical fitness certificate can be tracked where required.                                                                               |
|   7 | Certification and health evidence can be linked to Document Management.                                                                                          |
|   8 | Certification status can show compliant, pending, missing, expiring, expired, rejected, waived, or not required.                                                 |
|   9 | Employees with missing or expired certification are flagged.                                                                                                     |
|  10 | Employees with overdue allergen or food safety training are flagged.                                                                                             |
|  11 | Expiring food handler permits generate alerts before expiry.                                                                                                     |
|  12 | Expiring health certificates generate alerts before expiry where required.                                                                                       |
|  13 | Certificate renewal can be tracked from pending renewal to verified renewal.                                                                                     |
|  14 | Authorized HR, compliance, or outlet manager can verify submitted evidence.                                                                                      |
|  15 | Rejected evidence stores rejection reason.                                                                                                                       |
|  16 | Employees with missing, expired, or rejected certification can be restricted from food handling duties.                                                          |
|  17 | Food handling eligibility status is available to Shift Scheduling where required.                                                                                |
|  18 | Mandatory training completion status is available to Compliance & Regulatory Tracking.                                                                           |
|  19 | Learning requirements are available to LMS or Training & Development.                                                                                            |
|  20 | Compliance dashboard can show readiness by outlet, role, department, manager, legal entity, and status.                                                          |
|  21 | Reports can be generated for expired permits, expiring permits, missing certifications, overdue training, and outlet readiness.                                  |
|  22 | Health certification records are hidden from unauthorized users.                                                                                                 |
|  23 | Every requirement setup, certificate submission, verification, rejection, renewal, expiry alert, duty restriction, and compliance review creates an audit event. |
