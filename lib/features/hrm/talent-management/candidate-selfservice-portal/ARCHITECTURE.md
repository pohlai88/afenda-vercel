# Recruitment Self-Service Portal

## Definition

**Recruitment Self-Service Portal is the HRM function that allows candidates, employees, hiring managers, interviewers, recruiters, and approvers to perform recruitment-related actions through role-based self-service access, including job applications, candidate profile updates, interview participation, hiring feedback, offer review, requisition requests, and recruitment task tracking.**

---

# Recruitment Self-Service Portal Includes

| Area                             | What It Covers                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Candidate Portal**             | Candidate registration, profile creation, application tracking, resume upload                       |
| **Career Site Access**           | Job search, job listing, job application, application submission                                    |
| **Candidate Profile Management** | Personal details, contact information, resume, cover letter, portfolio, certificates                |
| **Application Tracking**         | Application status, hiring stage, interview status, offer status                                    |
| **Internal Job Application**     | Existing employee applies for internal vacancy                                                      |
| **Job Alert Subscription**       | Candidate job alerts, saved jobs, matching vacancy notification                                     |
| **Interview Self-Service**       | Interview invitation, interview confirmation, reschedule request, interview instructions            |
| **Assessment Access**            | Online assessment link, test submission, assessment status                                          |
| **Candidate Communication**      | Application confirmation, interview reminder, rejection notice, offer communication                 |
| **Offer Self-Service**           | Offer viewing, offer acceptance, offer decline, offer document acknowledgment                       |
| **Pre-Employment Forms**         | Candidate information form, right-to-work details, reference details, medical declaration reference |
| **Document Submission**          | Resume, identity document reference, certificate, portfolio, work eligibility document              |
| **Hiring Manager Portal**        | Requisition request, candidate review, shortlist feedback, interview feedback                       |
| **Interviewer Portal**           | Interview schedule, scorecard submission, evaluation comments, hiring recommendation                |
| **Recruiter Workspace**          | Candidate pipeline updates, communication tracking, task follow-up                                  |
| **Approver Portal**              | Requisition approval, offer approval, exception approval                                            |
| **Recruitment Task Tracking**    | Pending interviews, pending feedback, pending approvals, pending offer actions                      |
| **Audit Trail**                  | Submitted by, reviewed by, approved by, updated by, accepted by, timestamp                          |

---

# Recruitment Self-Service Portal Does Not Include

| Excluded Area                       | Owned By                                                 |
| ----------------------------------- | -------------------------------------------------------- |
| Recruitment pipeline engine         | Recruitment & Applicant Tracking                         |
| Job requisition workflow rules      | Recruitment & Applicant Tracking                         |
| Resume parsing engine               | Recruitment & Applicant Tracking                         |
| Interview scheduling logic          | Recruitment & Applicant Tracking                         |
| Offer approval workflow             | Recruitment & Applicant Tracking                         |
| Employee master profile after hire  | Employee Records Management                              |
| New-hire onboarding workflow        | Recruitment & Onboarding / Employee Lifecycle Management |
| Employee self-service portal        | Employee Self-Service Portal                             |
| Payroll setup                       | Payroll Processing                                       |
| Compensation planning               | Compensation Planning & Modeling                         |
| Background check provider ownership | External Provider / Compliance                           |
| Document storage engine             | Document Management                                      |
| Organization hierarchy              | Organizational Chart & Hierarchy                         |
| User permission governance          | IAM / Access Control                                     |

---

# Recruitment Self-Service Portal Requirement Statement

| Requirement                         | Description                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recruitment Self-Service Portal** | Provides role-based self-service access for candidates, internal applicants, hiring managers, interviewers, recruiters, and approvers to submit applications, manage candidate profiles, track application status, confirm interviews, complete assessments, submit hiring feedback, review offers, approve requisitions or offers, manage recruitment tasks, and maintain audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-RSS-001** | System shall provide a candidate-facing recruitment portal.                                                                                                                                                                         |
| **HRM-RSS-002** | System shall allow external candidates to create and maintain candidate profiles.                                                                                                                                                   |
| **HRM-RSS-003** | System shall allow candidates to search and view open job postings.                                                                                                                                                                 |
| **HRM-RSS-004** | System shall allow candidates to submit job applications online.                                                                                                                                                                    |
| **HRM-RSS-005** | System shall allow candidates to upload resume, cover letter, certificates, portfolio, or supporting documents.                                                                                                                     |
| **HRM-RSS-006** | System shall allow candidates to track application status.                                                                                                                                                                          |
| **HRM-RSS-007** | System shall allow candidates to update permitted profile information before hiring decision.                                                                                                                                       |
| **HRM-RSS-008** | System shall allow candidates to receive and respond to interview invitations.                                                                                                                                                      |
| **HRM-RSS-009** | System shall allow candidates to request interview rescheduling where enabled.                                                                                                                                                      |
| **HRM-RSS-010** | System shall allow candidates to access assigned assessments where enabled.                                                                                                                                                         |
| **HRM-RSS-011** | System shall allow candidates to complete pre-employment forms where required.                                                                                                                                                      |
| **HRM-RSS-012** | System shall allow candidates to view, accept, decline, or acknowledge offers where enabled.                                                                                                                                        |
| **HRM-RSS-013** | System shall allow candidates to withdraw applications.                                                                                                                                                                             |
| **HRM-RSS-014** | System shall support internal employee applications for internal job postings.                                                                                                                                                      |
| **HRM-RSS-015** | System shall allow hiring managers to submit requisition requests where enabled.                                                                                                                                                    |
| **HRM-RSS-016** | System shall allow hiring managers to view candidates assigned to their requisitions.                                                                                                                                               |
| **HRM-RSS-017** | System shall allow hiring managers to shortlist, reject, or comment on candidates where authorized.                                                                                                                                 |
| **HRM-RSS-018** | System shall allow interviewers to view assigned interviews.                                                                                                                                                                        |
| **HRM-RSS-019** | System shall allow interviewers to submit interview scorecards, ratings, comments, and hiring recommendations.                                                                                                                      |
| **HRM-RSS-020** | System shall allow approvers to approve, reject, return, or request clarification for requisitions.                                                                                                                                 |
| **HRM-RSS-021** | System shall allow approvers to approve, reject, return, or request clarification for offers.                                                                                                                                       |
| **HRM-RSS-022** | System shall display recruitment tasks by role, including pending applications, pending interviews, pending feedback, pending approvals, and pending offer actions.                                                                 |
| **HRM-RSS-023** | System shall send portal notifications for application updates, interview invitations, reminders, assessments, offers, approvals, rejections, and pending tasks.                                                                    |
| **HRM-RSS-024** | System shall restrict candidate, application, interview, scorecard, offer, and approval visibility based on role and permission.                                                                                                    |
| **HRM-RSS-025** | System shall protect candidate personal data with privacy controls and access logging.                                                                                                                                              |
| **HRM-RSS-026** | System shall support candidate consent collection for data processing where required.                                                                                                                                               |
| **HRM-RSS-027** | System shall support candidate account closure or data retention handling according to policy.                                                                                                                                      |
| **HRM-RSS-028** | System shall maintain audit trail for profile creation, application submission, document upload, interview response, assessment access, scorecard submission, offer response, approval, rejection, withdrawal, and account actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                                        |
| --: | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | External candidate can create a candidate profile.                                                                                                         |
|   2 | Candidate can search and view open job postings.                                                                                                           |
|   3 | Candidate can submit application online.                                                                                                                   |
|   4 | Candidate can upload resume and supporting documents.                                                                                                      |
|   5 | Candidate can track application status.                                                                                                                    |
|   6 | Candidate can update permitted candidate profile fields.                                                                                                   |
|   7 | Candidate can receive and respond to interview invitation.                                                                                                 |
|   8 | Candidate can request interview rescheduling where enabled.                                                                                                |
|   9 | Candidate can access assigned assessment where enabled.                                                                                                    |
|  10 | Candidate can complete required pre-employment forms.                                                                                                      |
|  11 | Candidate can view, accept, decline, or acknowledge offer where enabled.                                                                                   |
|  12 | Candidate can withdraw application.                                                                                                                        |
|  13 | Internal employee can apply for internal job posting where enabled.                                                                                        |
|  14 | Hiring manager can submit requisition request where enabled.                                                                                               |
|  15 | Hiring manager can view candidates for assigned requisitions.                                                                                              |
|  16 | Hiring manager can shortlist, reject, or comment on candidates where authorized.                                                                           |
|  17 | Interviewer can view assigned interviews.                                                                                                                  |
|  18 | Interviewer can submit interview scorecard, rating, comments, and recommendation.                                                                          |
|  19 | Approver can approve, reject, return, or request clarification for requisitions.                                                                           |
|  20 | Approver can approve, reject, return, or request clarification for offers.                                                                                 |
|  21 | Recruitment tasks are visible by user role and responsibility.                                                                                             |
|  22 | Candidate and recruitment users receive notifications for relevant recruitment events.                                                                     |
|  23 | Candidate personal data is hidden from unauthorized users.                                                                                                 |
|  24 | Candidate consent is captured where required.                                                                                                              |
|  25 | Candidate account closure or retention action follows configured policy.                                                                                   |
|  26 | Every profile, application, document, interview, assessment, scorecard, offer, approval, rejection, withdrawal, and account action creates an audit event. |
