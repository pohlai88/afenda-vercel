# Document Management

## Definition

**Document Management is the HRM function that stores, organizes, secures, tracks, and controls employee-related documents, including employment contracts, identity documents, certifications, HR letters, policy acknowledgments, statutory documents, and document expiry records.**

---

# Document Management Includes

| Area                             | What It Covers                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| **Employee Document Repository** | Central storage of employee-related documents                                               |
| **Employment Documents**         | Offer letter, appointment letter, employment contract, contract renewal letter              |
| **Identity Documents**           | NRIC, passport, work permit, visa, national ID                                              |
| **Qualification Documents**      | Degree certificate, professional certificate, license, training certificate                 |
| **Payroll-Related Documents**    | Bank form, tax form, statutory registration form, payroll declaration reference             |
| **Policy Acknowledgments**       | Employee handbook acknowledgment, code of conduct, IT policy, safety policy                 |
| **HR Letters**                   | Confirmation letter, promotion letter, transfer letter, warning letter, disciplinary letter |
| **Medical / Leave Documents**    | Medical certificate, fitness certificate, hospitalization document, maternity document      |
| **Compliance Documents**         | Consent forms, statutory declarations, right-to-work documents, regulatory forms            |
| **Document Categories**          | Document type, document group, mandatory/optional flag                                      |
| **Document Versioning**          | Version number, latest version, previous version, replacement record                        |
| **Document Expiry Tracking**     | Expiry date, renewal due date, expired document status                                      |
| **Document Verification**        | Pending verification, verified, rejected, expired                                           |
| **Access Control**               | Role-based access, field/document-level permission, secure download control                 |
| **Retention Control**            | Retention period, archive rule, deletion/anonymization rule                                 |
| **Audit Trail**                  | Uploaded by, viewed by, downloaded by, verified by, replaced by, timestamp                  |

---

# Document Management Does Not Include

| Excluded Area                         | Owned By                                         |
| ------------------------------------- | ------------------------------------------------ |
| Employee master profile               | Employee Records Management                      |
| Employee employment status            | Employee Records Management                      |
| Organization hierarchy                | Organizational Chart & Hierarchy                 |
| Employee self-service portal          | Employee Self-Service                            |
| Payroll calculation                   | Payroll                                          |
| Leave approval workflow               | Leave Management                                 |
| Attendance records                    | Time & Attendance                                |
| Performance review documents creation | Performance Management                           |
| Training course management            | Learning / Training Management                   |
| Compliance rule monitoring            | Compliance & Regulatory Tracking                 |
| Offboarding checklist workflow        | Offboarding & Exit Management                    |
| Asset assignment documents            | Asset Management / Document Management link only |
| Legal case handling                   | Legal / Compliance Management                    |

---

# Document Management Requirement Statement

| Requirement             | Description                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Document Management** | Stores, organizes, secures, versions, tracks, and manages employee-related documents such as employment contracts, identity documents, certifications, HR letters, statutory forms, medical certificates, and policy acknowledgments, with expiry tracking, verification status, access control, retention rules, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **HRM-DOC-001** | System shall allow authorized users to upload employee-related documents.                                                   |
| **HRM-DOC-002** | System shall categorize documents by document type, document group, employee, legal entity, and status.                     |
| **HRM-DOC-003** | System shall link documents to employee records.                                                                            |
| **HRM-DOC-004** | System shall support mandatory and optional document classification.                                                        |
| **HRM-DOC-005** | System shall support document versioning.                                                                                   |
| **HRM-DOC-006** | System shall identify the latest active version of a document.                                                              |
| **HRM-DOC-007** | System shall preserve previous document versions based on retention rules.                                                  |
| **HRM-DOC-008** | System shall support document verification status: pending, verified, rejected, expired, archived.                          |
| **HRM-DOC-009** | System shall allow authorized HR users to approve or reject submitted documents.                                            |
| **HRM-DOC-010** | System shall capture rejection reason for rejected documents.                                                               |
| **HRM-DOC-011** | System shall support document expiry date tracking.                                                                         |
| **HRM-DOC-012** | System shall generate alerts for documents approaching expiry.                                                              |
| **HRM-DOC-013** | System shall flag expired documents.                                                                                        |
| **HRM-DOC-014** | System shall support renewal or replacement of expired documents.                                                           |
| **HRM-DOC-015** | System shall support policy acknowledgment records.                                                                         |
| **HRM-DOC-016** | System shall record employee acknowledgment date, acknowledgment version, and acknowledgment method.                        |
| **HRM-DOC-017** | System shall restrict access to confidential documents based on role and permission.                                        |
| **HRM-DOC-018** | System shall support secure document download permissions.                                                                  |
| **HRM-DOC-019** | System shall prevent unauthorized users from viewing sensitive employee documents.                                          |
| **HRM-DOC-020** | System shall support document search by employee, document type, expiry status, verification status, and upload date.       |
| **HRM-DOC-021** | System shall support document retention rules.                                                                              |
| **HRM-DOC-022** | System shall support document archiving after employee separation.                                                          |
| **HRM-DOC-023** | System shall maintain audit trail for upload, view, download, verify, reject, replace, archive, and delete actions.         |
| **HRM-DOC-024** | System shall support employee-submitted documents through Employee Self-Service where enabled.                              |
| **HRM-DOC-025** | System shall expose document readiness status to Employee Records Management, Compliance, Payroll, and Offboarding modules. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                         |
| --: | ------------------------------------------------------------------------------------------- |
|   1 | Authorized HR user can upload a document and link it to an employee record.                 |
|   2 | Uploaded document must have document type, employee reference, upload date, and status.     |
|   3 | Mandatory documents are clearly identified.                                                 |
|   4 | Missing mandatory documents are flagged.                                                    |
|   5 | Document can be marked as pending verification, verified, rejected, expired, or archived.   |
|   6 | Rejected document stores rejection reason.                                                  |
|   7 | Document expiry date can be recorded.                                                       |
|   8 | Expiring documents are flagged before expiry.                                               |
|   9 | Expired documents are clearly shown as expired.                                             |
|  10 | Document replacement creates a new version without losing previous version history.         |
|  11 | Latest document version is clearly identified.                                              |
|  12 | Employees can submit permitted documents through self-service where enabled.                |
|  13 | Employees can acknowledge required policies.                                                |
|  14 | Policy acknowledgment records store employee, policy version, date, and timestamp.          |
|  15 | Sensitive documents are hidden from unauthorized users.                                     |
|  16 | Document download is restricted based on permission.                                        |
|  17 | HR can search documents by employee, type, status, expiry, and verification state.          |
|  18 | Employee record can display linked document readiness without owning the document workflow. |
|  19 | Document records remain available after employee separation according to retention policy.  |
|  20 | Every document action creates an audit event.                                               |
