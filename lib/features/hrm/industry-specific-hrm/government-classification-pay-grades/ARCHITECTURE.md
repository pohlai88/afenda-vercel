# Government Classification & Pay Grades

## Definition

**Government Classification & Pay Grades is the HRM function that manages public-sector job classifications, pay grades, pay scales, salary steps, locality adjustments, grade progression, step increase eligibility, classification history, and payroll-ready compensation references for government or regulated workforce structures.**

---

# Government Classification & Pay Grades Includes

| Area                                  | What It Covers                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Government Job Classification**     | Civil service class, service scheme, occupational group, job series, job family                |
| **Pay Grade Management**              | Grade level, pay band, rank, classification level, salary grade                                |
| **Pay Scale Management**              | Salary table, base pay scale, minimum rate, maximum rate, step range                           |
| **Step Management**                   | Step level, increment step, progression step, waiting period, step effective date              |
| **Locality Adjustment**               | Locality pay area, regional allowance, cost-of-living adjustment, hardship area reference      |
| **GS / SES Classification Reference** | General Schedule grade, Senior Executive Service band, executive classification reference      |
| **Classification Eligibility**        | Eligibility by role, agency, department, appointment type, tenure, performance, service status |
| **Step Increase Calculation**         | Within-grade increase, annual increment, service-based increase, merit step increase           |
| **Promotion Grade Movement**          | Grade promotion, pay band movement, reclassification, acting grade reference                   |
| **Demotion / Downgrade Handling**     | Grade reduction, retained pay, pay protection reference                                        |
| **Pay Retention Rules**               | Saved pay, salary protection, grade retention, transition pay reference                        |
| **Appointment Type Reference**        | Permanent, temporary, contract, political appointment, civil service appointment               |
| **Public Sector Allowance Reference** | Housing allowance, hardship allowance, duty allowance, regional allowance                      |
| **Classification Review**             | Job evaluation, classification audit, reclassification request, appeal reference               |
| **Payroll Integration**               | Grade, step, pay table, locality adjustment, allowance reference, effective date               |
| **Reporting**                         | Grade distribution, step progression, classification report, pay scale report                  |
| **Audit Trail**                       | Classified by, reviewed by, approved by, changed by, effective date, reason, timestamp         |

---

# Government Classification & Pay Grades Does Not Include

| Excluded Area                         | Owned By                         |
| ------------------------------------- | -------------------------------- |
| Employee master profile               | Employee Records Management      |
| Organization hierarchy                | Organizational Chart & Hierarchy |
| Payroll run calculation               | Payroll Processing               |
| Multi-country payroll statutory rules | Multi-Country Payroll            |
| Compensation planning cycle           | Compensation Planning & Modeling |
| Bonus and incentive payout            | Bonus & Incentive Management     |
| Salary benchmarking against market    | Salary Benchmarking & Surveys    |
| Performance appraisal scoring         | Performance Appraisals           |
| Promotion workflow execution          | Employee Lifecycle Management    |
| Recruitment requisition workflow      | Recruitment & Applicant Tracking |
| Employee document storage             | Document Management              |
| Government filing submission          | Compliance & Regulatory Tracking |
| Budget appropriation ownership        | Finance / Budgeting              |
| Union agreement negotiation           | Labor Relations                  |
| Legal classification dispute handling | Legal / Compliance               |

---

# Government Classification & Pay Grades Requirement Statement

| Requirement                                | Description                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Government Classification & Pay Grades** | Manages government job classifications, pay grades, salary tables, pay scales, steps, GS/SES or equivalent public-sector classifications, locality adjustments, grade progression, step increase eligibility, promotion and reclassification references, payroll integration, reporting, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-GPG-001** | System shall create and maintain government job classification structures.                                                                                                                                        |
| **HRM-GPG-002** | System shall support classification by occupational group, job series, service scheme, job family, agency, department, and position.                                                                              |
| **HRM-GPG-003** | System shall create and maintain pay grades.                                                                                                                                                                      |
| **HRM-GPG-004** | System shall create and maintain pay bands or pay ranges.                                                                                                                                                         |
| **HRM-GPG-005** | System shall create and maintain salary tables by effective date.                                                                                                                                                 |
| **HRM-GPG-006** | System shall support salary table versioning.                                                                                                                                                                     |
| **HRM-GPG-007** | System shall define minimum salary, maximum salary, and step values for each grade or pay band.                                                                                                                   |
| **HRM-GPG-008** | System shall support GS, SES, civil service grade, rank, or equivalent classification references.                                                                                                                 |
| **HRM-GPG-009** | System shall assign employee positions to classification, grade, pay band, and step references.                                                                                                                   |
| **HRM-GPG-010** | System shall support locality adjustment rules by locality area, region, country, city, duty station, or work location.                                                                                           |
| **HRM-GPG-011** | System shall calculate locality-adjusted pay reference where applicable.                                                                                                                                          |
| **HRM-GPG-012** | System shall support regional, hardship, remote area, or cost-of-living adjustment references where applicable.                                                                                                   |
| **HRM-GPG-013** | System shall define step increase eligibility rules.                                                                                                                                                              |
| **HRM-GPG-014** | System shall calculate next step eligibility date based on service period, grade, step, appointment type, and performance reference.                                                                              |
| **HRM-GPG-015** | System shall identify employees eligible for step increase.                                                                                                                                                       |
| **HRM-GPG-016** | System shall support automatic or approval-based step increase processing.                                                                                                                                        |
| **HRM-GPG-017** | System shall support promotion-related grade and step movement.                                                                                                                                                   |
| **HRM-GPG-018** | System shall support reclassification from one classification or grade to another.                                                                                                                                |
| **HRM-GPG-019** | System shall support demotion or downgrade handling.                                                                                                                                                              |
| **HRM-GPG-020** | System shall support pay retention, grade retention, or saved-pay references where policy allows.                                                                                                                 |
| **HRM-GPG-021** | System shall support acting grade or temporary higher-duty assignment reference.                                                                                                                                  |
| **HRM-GPG-022** | System shall validate classification and pay grade eligibility by position, appointment type, employee category, agency, department, and policy group.                                                            |
| **HRM-GPG-023** | System shall prevent invalid grade, step, or classification assignments.                                                                                                                                          |
| **HRM-GPG-024** | System shall support effective-dated classification and pay grade changes.                                                                                                                                        |
| **HRM-GPG-025** | System shall preserve classification, grade, step, and pay table history.                                                                                                                                         |
| **HRM-GPG-026** | System shall expose approved grade, step, pay table, locality adjustment, and allowance references to Payroll Processing.                                                                                         |
| **HRM-GPG-027** | System shall expose grade movement references to Employee Lifecycle Management.                                                                                                                                   |
| **HRM-GPG-028** | System shall support classification review, classification correction, and reclassification request references.                                                                                                   |
| **HRM-GPG-029** | System shall provide reports by classification, grade, step, pay band, agency, department, locality, position, and effective date.                                                                                |
| **HRM-GPG-030** | System shall restrict classification, pay grade, salary table, and step adjustment data based on HR, payroll, compensation, manager, finance, and auditor permissions.                                            |
| **HRM-GPG-031** | System shall maintain audit trail for classification setup, salary table setup, grade assignment, step movement, locality adjustment, reclassification, pay retention, approval, and payroll integration actions. |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                                                                          |
| --: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Government classification structure can be created by occupational group, job series, service scheme, job family, agency, department, and position.                                          |
|   2 | Pay grade or pay band can be created with code, name, effective date, and status.                                                                                                            |
|   3 | Salary table can be created with grade, step, base rate, effective date, and version.                                                                                                        |
|   4 | Salary table versions are preserved historically.                                                                                                                                            |
|   5 | GS, SES, civil service grade, rank, or equivalent classification reference can be assigned where applicable.                                                                                 |
|   6 | Employee position can be linked to classification, grade, pay band, and step.                                                                                                                |
|   7 | Locality adjustment can be configured by duty station, region, city, country, or work location.                                                                                              |
|   8 | Locality-adjusted pay reference can be calculated where applicable.                                                                                                                          |
|   9 | Regional, hardship, remote area, or cost-of-living adjustment reference can be maintained where applicable.                                                                                  |
|  10 | Step increase eligibility rules can be configured.                                                                                                                                           |
|  11 | Next step eligibility date can be calculated.                                                                                                                                                |
|  12 | Employees eligible for step increase can be identified.                                                                                                                                      |
|  13 | Step increase can be processed automatically or through approval workflow based on policy.                                                                                                   |
|  14 | Promotion-related grade and step movement can be processed.                                                                                                                                  |
|  15 | Reclassification can move a position or employee from one classification or grade to another.                                                                                                |
|  16 | Demotion or downgrade can be recorded with reason and effective date.                                                                                                                        |
|  17 | Pay retention or grade retention reference can be recorded where policy allows.                                                                                                              |
|  18 | Acting grade or temporary higher-duty assignment reference can be recorded.                                                                                                                  |
|  19 | Invalid grade, step, classification, or salary table assignment is blocked.                                                                                                                  |
|  20 | Classification and pay grade changes support effective dates.                                                                                                                                |
|  21 | Classification, grade, step, salary table, and locality history remain traceable.                                                                                                            |
|  22 | Approved grade, step, salary table, locality adjustment, and allowance references are available to Payroll Processing.                                                                       |
|  23 | Grade movement references are available to Employee Lifecycle Management.                                                                                                                    |
|  24 | Classification and pay grade reports can be generated by classification, grade, step, department, agency, locality, position, and effective date.                                            |
|  25 | Unauthorized users cannot view or modify restricted classification, salary table, grade, or step data.                                                                                       |
|  26 | Every classification setup, salary table setup, grade assignment, step movement, locality adjustment, reclassification, retention, approval, and payroll integration creates an audit event. |
