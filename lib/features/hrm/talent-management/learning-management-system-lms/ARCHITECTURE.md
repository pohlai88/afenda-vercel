# Learning Management System (LMS)

## Definition

**Learning Management System (LMS) is the HRM function that delivers, manages, tracks, and reports employee learning through online courses, learning paths, certifications, compliance training, assessments, progress dashboards, and completion records.**

---

# Learning Management System Includes

| Area                           | What It Covers                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Online Course Delivery**     | E-learning course, video lesson, reading material, interactive module, SCORM/xAPI content reference |
| **Course Catalog**             | Course title, category, description, provider, duration, level, language, delivery mode             |
| **Learning Path**              | Structured sequence of courses, role-based learning path, onboarding path, compliance path          |
| **Training Assignment**        | Required training, optional training, manager-assigned training, HR-assigned training               |
| **Employee Enrollment**        | Course enrollment, self-enrollment, bulk enrollment, approval-based enrollment                      |
| **Progress Tracking**          | Not started, in progress, completed, failed, expired, renewed                                       |
| **Assessment & Quiz**          | Quiz, test, passing score, attempt limit, assessment result                                         |
| **Certification Tracking**     | Certificate issue date, expiry date, renewal date, certification evidence                           |
| **Compliance Training**        | Mandatory policy training, safety training, regulatory training, code of conduct training           |
| **Completion Record**          | Completion date, score, duration, certificate, trainer/provider reference                           |
| **Learning Dashboard**         | Employee progress, team progress, overdue training, completion percentage                           |
| **Manager Dashboard**          | Team learning status, mandatory training completion, certification risk                             |
| **HR Dashboard**               | Organization-wide completion, compliance training status, skills development status                 |
| **Reminder & Notification**    | Training assigned, due soon, overdue, completed, failed, certification expiry                       |
| **Learning History**           | Completed courses, expired certifications, previous attempts, past learning records                 |
| **Content Provider Reference** | Internal LMS content, external provider, learning vendor, certification body                        |
| **Integration Reference**      | HR profile, compliance tracking, performance appraisal, onboarding, employee lifecycle              |
| **Audit Trail**                | Assigned by, enrolled by, started by, completed by, certified by, timestamp, score                  |

---

# Learning Management System Does Not Include

| Excluded Area                           | Owned By                                        |
| --------------------------------------- | ----------------------------------------------- |
| Employee master profile                 | Employee Records Management                     |
| Employee skill profile ownership        | Training & Development                          |
| Development plan ownership              | Training & Development / Performance Appraisals |
| Performance review scoring              | Performance Appraisals                          |
| Compensation planning                   | Compensation Planning & Modeling                |
| Bonus calculation                       | Bonus & Incentive Management                    |
| Payroll calculation                     | Payroll Processing                              |
| Expense reimbursement for training cost | Expense Reimbursement                           |
| Document storage engine                 | Document Management                             |
| Compliance rule ownership               | Compliance & Regulatory Tracking                |
| Organization hierarchy                  | Organizational Chart & Hierarchy                |
| Succession planning decisions           | Succession Planning                             |
| External course content ownership       | External LMS / Content Provider                 |
| Finance budget approval                 | Finance / Budgeting                             |

---

# Learning Management System Requirement Statement

| Requirement                          | Description                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Learning Management System (LMS)** | Delivers and tracks online courses, learning paths, certifications, assessments, and compliance training with employee, manager, and HR progress dashboards, reminders, completion records, reporting, integration references, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-LMS-001** | System shall create and maintain an online learning course catalog.                                                                                                                                             |
| **HRM-LMS-002** | System shall support course types including online course, video lesson, reading module, quiz, assessment, certification, compliance training, and blended learning reference.                                  |
| **HRM-LMS-003** | System shall maintain course metadata including title, category, description, provider, duration, level, language, delivery mode, and validity period.                                                          |
| **HRM-LMS-004** | System shall support internal and external learning content references.                                                                                                                                         |
| **HRM-LMS-005** | System shall support SCORM, xAPI, or external LMS content references where enabled.                                                                                                                             |
| **HRM-LMS-006** | System shall create and maintain learning paths.                                                                                                                                                                |
| **HRM-LMS-007** | System shall support role-based, department-based, onboarding, compliance, safety, leadership, and certification learning paths.                                                                                |
| **HRM-LMS-008** | System shall assign courses or learning paths to employees individually or in bulk.                                                                                                                             |
| **HRM-LMS-009** | System shall support mandatory and optional learning assignment classification.                                                                                                                                 |
| **HRM-LMS-010** | System shall allow employees to self-enroll in available courses where enabled.                                                                                                                                 |
| **HRM-LMS-011** | System shall support manager or HR approval for enrollment where required.                                                                                                                                      |
| **HRM-LMS-012** | System shall track course progress status including not started, in progress, completed, failed, overdue, expired, renewed, and cancelled.                                                                      |
| **HRM-LMS-013** | System shall track lesson progress, module progress, completion percentage, time spent, and last accessed date where supported.                                                                                 |
| **HRM-LMS-014** | System shall support quizzes and assessments.                                                                                                                                                                   |
| **HRM-LMS-015** | System shall capture assessment score, passing score, attempt count, result, and completion date.                                                                                                               |
| **HRM-LMS-016** | System shall enforce passing score and attempt limit where configured.                                                                                                                                          |
| **HRM-LMS-017** | System shall issue or record course completion certificates where enabled.                                                                                                                                      |
| **HRM-LMS-018** | System shall track certification issue date, expiry date, renewal date, and certification status.                                                                                                               |
| **HRM-LMS-019** | System shall generate reminders for due, overdue, failed, incomplete, and expiring certification items.                                                                                                         |
| **HRM-LMS-020** | System shall support mandatory compliance training assignment.                                                                                                                                                  |
| **HRM-LMS-021** | System shall expose mandatory training completion status to Compliance & Regulatory Tracking.                                                                                                                   |
| **HRM-LMS-022** | System shall expose onboarding learning completion status to Recruitment & Onboarding or Employee Lifecycle Management.                                                                                         |
| **HRM-LMS-023** | System shall expose learning completion and certification references to Training & Development.                                                                                                                 |
| **HRM-LMS-024** | System shall provide employee learning dashboard.                                                                                                                                                               |
| **HRM-LMS-025** | System shall provide manager team-learning dashboard.                                                                                                                                                           |
| **HRM-LMS-026** | System shall provide HR learning administration dashboard.                                                                                                                                                      |
| **HRM-LMS-027** | System shall provide progress, completion, overdue, certification, and compliance training reports.                                                                                                             |
| **HRM-LMS-028** | System shall restrict course assignment, course access, progress visibility, assessment results, and certification records based on role and permission.                                                        |
| **HRM-LMS-029** | System shall preserve learning history by employee, course, learning path, certification, provider, and period.                                                                                                 |
| **HRM-LMS-030** | System shall maintain audit trail for course setup, learning path setup, assignment, enrollment, progress update, assessment, completion, failure, certification, renewal, reminder, and report export actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                                              |
| --: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Online course can be created with title, category, provider, duration, language, level, delivery mode, and description.                                          |
|   2 | Course can be classified as online course, video lesson, reading module, quiz, assessment, certification, compliance training, or blended learning reference.    |
|   3 | Internal or external learning content reference can be attached to a course.                                                                                     |
|   4 | SCORM, xAPI, or external LMS content reference can be supported where enabled.                                                                                   |
|   5 | Learning path can be created with ordered course sequence.                                                                                                       |
|   6 | Learning paths can be assigned by role, department, onboarding need, compliance need, safety requirement, or certification requirement.                          |
|   7 | Courses or learning paths can be assigned to employees individually or in bulk.                                                                                  |
|   8 | Learning assignment can be marked as mandatory or optional.                                                                                                      |
|   9 | Employee can self-enroll in available courses where enabled.                                                                                                     |
|  10 | Enrollment can require manager or HR approval where configured.                                                                                                  |
|  11 | Employee course progress can be tracked as not started, in progress, completed, failed, overdue, expired, renewed, or cancelled.                                 |
|  12 | Lesson progress, completion percentage, time spent, and last accessed date can be tracked where supported.                                                       |
|  13 | Assessment score, passing score, attempt count, and result can be recorded.                                                                                      |
|  14 | Passing score and attempt limit are enforced where configured.                                                                                                   |
|  15 | Completion certificate can be issued or recorded.                                                                                                                |
|  16 | Certification issue date, expiry date, renewal date, and status can be tracked.                                                                                  |
|  17 | Due, overdue, incomplete, failed, and expiring certification items generate reminders.                                                                           |
|  18 | Mandatory compliance training completion is available to Compliance & Regulatory Tracking.                                                                       |
|  19 | Onboarding learning completion is available to Recruitment & Onboarding or Employee Lifecycle Management.                                                        |
|  20 | Learning completion and certification references are available to Training & Development.                                                                        |
|  21 | Employee can view own learning progress dashboard.                                                                                                               |
|  22 | Manager can view team learning progress where authorized.                                                                                                        |
|  23 | HR can view organization-wide learning completion and overdue training dashboards.                                                                               |
|  24 | LMS reports can be generated by employee, course, learning path, department, manager, certification, status, provider, and period.                               |
|  25 | Unauthorized users cannot view or modify restricted learning, assessment, or certification records.                                                              |
|  26 | Learning history remains available by employee, course, learning path, certification, provider, and period.                                                      |
|  27 | Every course setup, assignment, enrollment, progress update, assessment, completion, certification, renewal, reminder, and report export creates an audit event. |
