# Performance Appraisals

## Definition

**Performance Appraisals is the HRM function that manages employee performance review cycles, including goal setting, self-assessments, manager evaluations, competency reviews, feedback collection, rating calibration, performance outcomes, development actions, approval workflows, and audit history.**

---

# Performance Appraisals Includes

| Area                         | What It Covers                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| **Performance Review Cycle** | Annual review, mid-year review, probation review, project review, quarterly review      |
| **Goal Setting**             | Employee goals, department goals, KPI goals, role-based goals, measurable targets       |
| **Goal Tracking**            | Goal progress, completion percentage, target achievement, milestone status              |
| **Self-Assessment**          | Employee self-review, self-rating, achievement comments, reflection notes               |
| **Manager Evaluation**       | Manager rating, performance comments, achievement review, final evaluation              |
| **Competency Assessment**    | Role competency, leadership competency, technical competency, behavioral competency     |
| **KPI Evaluation**           | KPI score, target result, weighted score, achievement percentage                        |
| **Rating Scale**             | Numeric rating, descriptive rating, performance level, rating guide                     |
| **Performance Feedback**     | Manager feedback, peer feedback reference, HR feedback, review notes                    |
| **Review Meeting Tracking**  | Review discussion date, meeting notes, acknowledgment status                            |
| **Development Action**       | Improvement plan, development goal, training recommendation, coaching action            |
| **Performance Outcome**      | Final rating, performance category, promotion recommendation, compensation reference    |
| **Calibration Reference**    | Rating calibration, department normalization, HR review, leadership review              |
| **Approval Workflow**        | Manager submission, employee acknowledgment, HR review, final approval                  |
| **Performance History**      | Previous review cycles, past ratings, goal achievement history                          |
| **Reporting**                | Rating distribution, completion status, overdue reviews, department performance summary |
| **Audit Trail**              | Created by, submitted by, reviewed by, approved by, acknowledged by, timestamp          |

---

# Performance Appraisals Does Not Include

| Excluded Area                  | Owned By                              |
| ------------------------------ | ------------------------------------- |
| Employee master profile        | Employee Records Management           |
| Organization hierarchy         | Organizational Chart & Hierarchy      |
| Job and position structure     | Organizational Chart / Job Management |
| Salary adjustment planning     | Compensation Planning & Modeling      |
| Bonus payout calculation       | Bonus & Incentive Management          |
| Payroll calculation            | Payroll Processing                    |
| Training course management     | Learning & Development                |
| Disciplinary case management   | Employee Relations / Compliance       |
| Attendance record ownership    | Leave & Attendance Management         |
| Leave balance calculation      | Leave & Attendance Management         |
| Recruitment assessment scoring | Recruitment & Applicant Tracking      |
| Document storage engine        | Document Management                   |
| Workforce planning             | Workforce Planning                    |

---

# Performance Appraisals Requirement Statement

| Requirement                | Description                                                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance Appraisals** | Facilitates employee performance reviews with review cycles, goal setting, self-assessments, manager evaluations, competency reviews, KPI scoring, feedback, calibration references, development actions, approval workflow, reporting, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-PER-001** | System shall create and manage performance review cycles.                                                                                                                                       |
| **HRM-PER-002** | System shall support review types including annual, mid-year, quarterly, probation, project, and ad hoc reviews.                                                                                |
| **HRM-PER-003** | System shall define review period, review start date, submission deadline, approval deadline, and finalization date.                                                                            |
| **HRM-PER-004** | System shall assign eligible employees to performance review cycles.                                                                                                                            |
| **HRM-PER-005** | System shall determine review eligibility by employment status, tenure, department, grade, role, legal entity, and employee category.                                                           |
| **HRM-PER-006** | System shall allow employees and managers to define performance goals.                                                                                                                          |
| **HRM-PER-007** | System shall support goal weighting.                                                                                                                                                            |
| **HRM-PER-008** | System shall support measurable goal targets and achievement results.                                                                                                                           |
| **HRM-PER-009** | System shall track goal progress during the review period.                                                                                                                                      |
| **HRM-PER-010** | System shall allow employees to complete self-assessments.                                                                                                                                      |
| **HRM-PER-011** | System shall allow employees to provide self-ratings and comments.                                                                                                                              |
| **HRM-PER-012** | System shall allow managers to complete employee evaluations.                                                                                                                                   |
| **HRM-PER-013** | System shall allow managers to provide ratings, comments, and performance summaries.                                                                                                            |
| **HRM-PER-014** | System shall support competency-based assessment.                                                                                                                                               |
| **HRM-PER-015** | System shall support KPI-based assessment.                                                                                                                                                      |
| **HRM-PER-016** | System shall calculate weighted performance scores where configured.                                                                                                                            |
| **HRM-PER-017** | System shall support configurable rating scales.                                                                                                                                                |
| **HRM-PER-018** | System shall support manager recommendation for development, promotion, compensation review, or performance improvement.                                                                        |
| **HRM-PER-019** | System shall support employee acknowledgment of completed review.                                                                                                                               |
| **HRM-PER-020** | System shall support review meeting notes and discussion date.                                                                                                                                  |
| **HRM-PER-021** | System shall route performance reviews through approval workflow.                                                                                                                               |
| **HRM-PER-022** | System shall support HR review before finalization where required.                                                                                                                              |
| **HRM-PER-023** | System shall support rating calibration reference where enabled.                                                                                                                                |
| **HRM-PER-024** | System shall prevent finalization when mandatory review sections are incomplete.                                                                                                                |
| **HRM-PER-025** | System shall lock finalized performance reviews from normal editing.                                                                                                                            |
| **HRM-PER-026** | System shall preserve performance appraisal history by employee and review cycle.                                                                                                               |
| **HRM-PER-027** | System shall expose final rating and performance outcome references to Compensation Planning & Modeling and Bonus & Incentive Management where authorized.                                      |
| **HRM-PER-028** | System shall notify employees, managers, HR, and approvers of pending, submitted, returned, overdue, acknowledged, and finalized reviews.                                                       |
| **HRM-PER-029** | System shall provide performance reports by employee, manager, department, legal entity, review cycle, rating, completion status, and period.                                                   |
| **HRM-PER-030** | System shall restrict performance appraisal data based on employee, manager, HR, leadership, compensation, and auditor permissions.                                                             |
| **HRM-PER-031** | System shall maintain audit trail for goal creation, self-assessment, manager evaluation, rating change, submission, return, approval, acknowledgment, calibration reference, and finalization. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                       |
| --: | ----------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Performance review cycle can be created with review type, review period, deadline, and eligible population.                               |
|   2 | Eligible employees can be assigned to a review cycle.                                                                                     |
|   3 | Employee goals can be created with target, weight, due date, and progress status.                                                         |
|   4 | Manager can review and approve employee goals where required.                                                                             |
|   5 | Employee can complete self-assessment.                                                                                                    |
|   6 | Employee can provide self-rating and self-review comments.                                                                                |
|   7 | Manager can complete employee evaluation.                                                                                                 |
|   8 | Manager can provide rating, comments, and performance summary.                                                                            |
|   9 | Competency assessment can be completed where configured.                                                                                  |
|  10 | KPI-based assessment can be completed where configured.                                                                                   |
|  11 | Weighted performance score can be calculated where configured.                                                                            |
|  12 | Configurable rating scale can be applied to review forms.                                                                                 |
|  13 | Review cannot be finalized when mandatory sections are incomplete.                                                                        |
|  14 | Employee can acknowledge completed performance review.                                                                                    |
|  15 | Review meeting date and discussion notes can be recorded.                                                                                 |
|  16 | HR can review performance appraisal before finalization where required.                                                                   |
|  17 | Rating calibration reference can be recorded where enabled.                                                                               |
|  18 | Finalized performance review is locked from normal editing.                                                                               |
|  19 | Final performance outcome can be referenced by Compensation Planning & Modeling and Bonus & Incentive Management where authorized.        |
|  20 | Performance appraisal history remains available by employee and review cycle.                                                             |
|  21 | Performance reports can be generated by cycle, department, manager, rating, completion status, and period.                                |
|  22 | Unauthorized users cannot view or edit restricted performance appraisal data.                                                             |
|  23 | Notifications are sent for pending, submitted, returned, overdue, acknowledged, and finalized reviews.                                    |
|  24 | Every goal, self-assessment, manager evaluation, rating change, approval, acknowledgment, and finalization action creates an audit event. |
