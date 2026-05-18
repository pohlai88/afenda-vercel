# Organizational Chart & Hierarchy

## Definition

**Organizational Chart & Hierarchy is the HRM function that maintains and visualizes the company’s official organization structure, including legal entities, business units, departments, teams, positions, reporting lines, managerial hierarchy, and effective-dated organization changes.**

---

# Organizational Chart & Hierarchy Includes

| Area                           | What It Covers                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Legal Entity Structure**     | Company, subsidiary, branch, operating entity, employing entity                                          |
| **Business Unit Structure**    | Division, business unit, operating unit, profit center                                                   |
| **Department Structure**       | Department, sub-department, team, section, functional group                                              |
| **Position Structure**         | Position ID, position title, position owner, vacant/filled status                                        |
| **Reporting Structure**        | Direct manager, indirect manager, dotted-line manager, matrix reporting                                  |
| **Hierarchy Visualization**    | Org chart view, department tree, reporting tree, position hierarchy                                      |
| **Managerial Chain**           | Employee-to-manager relationship, approval chain, escalation path                                        |
| **Cost Center Reference**      | Cost center linkage, finance allocation reference                                                        |
| **Location Reference**         | Branch, site, office, work location, region                                                              |
| **Role / Function Grouping**   | Functional department, operational role group, job family grouping                                       |
| **Effective-Dated Structure**  | Past, current, and future department or reporting structure                                              |
| **Vacancy Visibility**         | Open positions, vacant seats, pending hires, blocked positions                                           |
| **Headcount View**             | Filled headcount, vacant headcount, planned headcount reference                                          |
| **Approval Routing Reference** | Reporting line used by workflows and approvals                                                           |
| **Audit Trail**                | Created by, updated by, previous structure, new structure, effective date, timestamp, approval reference |

---

# Organizational Chart & Hierarchy Does Not Include

| Excluded Area                         | Owned By                         |
| ------------------------------------- | -------------------------------- |
| Employee personal profile             | Employee Records Management      |
| Employee contact information          | Employee Records Management      |
| Employee employment history           | Employee Records Management      |
| Employee document storage             | Document Management              |
| Employee self-service profile changes | Employee Self-Service            |
| Recruitment pipeline                  | Recruitment Management           |
| Payroll calculation                   | Payroll                          |
| Leave application                     | Leave Management                 |
| Attendance logs                       | Time & Attendance                |
| Performance review                    | Performance Management           |
| Training records                      | Learning / Training Management   |
| Asset assignment                      | Asset Management                 |
| Offboarding workflow                  | Offboarding & Exit Management    |
| Compliance case tracking              | Compliance & Regulatory Tracking |

---

# Organizational Chart & Hierarchy Requirement Statement

| Requirement                          | Description                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Organizational Chart & Hierarchy** | Visualizes and manages the official organizational structure, including legal entities, business units, departments, teams, positions, reporting relationships, managerial hierarchy, effective-dated structure changes, vacant positions, headcount views, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| **HRM-ORG-001** | System shall create and maintain organization units.                                                          |
| **HRM-ORG-002** | System shall support legal entity, business unit, department, sub-department, team, and location structures.  |
| **HRM-ORG-003** | System shall maintain parent-child hierarchy between organization units.                                      |
| **HRM-ORG-004** | System shall visualize the organization structure as an org chart.                                            |
| **HRM-ORG-005** | System shall visualize employee reporting relationships.                                                      |
| **HRM-ORG-006** | System shall support direct reporting and dotted-line reporting relationships.                                |
| **HRM-ORG-007** | System shall support matrix reporting relationships where required.                                           |
| **HRM-ORG-008** | System shall maintain manager assignment for departments, teams, and positions.                               |
| **HRM-ORG-009** | System shall maintain position records within the organization structure.                                     |
| **HRM-ORG-010** | System shall identify whether a position is filled, vacant, planned, frozen, or closed.                       |
| **HRM-ORG-011** | System shall link employees to positions and organization units.                                              |
| **HRM-ORG-012** | System shall support effective-dated organization structure changes.                                          |
| **HRM-ORG-013** | System shall preserve historical organization structures.                                                     |
| **HRM-ORG-014** | System shall support future-dated reorganization planning.                                                    |
| **HRM-ORG-015** | System shall prevent invalid hierarchy loops.                                                                 |
| **HRM-ORG-016** | System shall prevent an organization unit from reporting to itself.                                           |
| **HRM-ORG-017** | System shall support cost center linkage for organization units and positions.                                |
| **HRM-ORG-018** | System shall support location linkage for organization units and positions.                                   |
| **HRM-ORG-019** | System shall provide headcount visibility by legal entity, department, team, manager, position, and location. |
| **HRM-ORG-020** | System shall provide vacancy visibility by department, team, position, manager, and location.                 |
| **HRM-ORG-021** | System shall expose reporting lines for approval workflows.                                                   |
| **HRM-ORG-022** | System shall expose manager hierarchy for escalation workflows.                                               |
| **HRM-ORG-023** | System shall allow authorized users to search, filter, and export organization structure data.                |
| **HRM-ORG-024** | System shall restrict organization structure changes to authorized HR or admin users.                         |
| **HRM-ORG-025** | System shall maintain audit trail for all organization hierarchy changes.                                     |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                           |
| --: | ------------------------------------------------------------------------------------------------------------- |
|   1 | Organization unit can be created with name, type, code, parent unit, effective date, and status.              |
|   2 | Legal entity, business unit, department, sub-department, team, and location structures can be maintained.     |
|   3 | Organization units can be arranged into a parent-child hierarchy.                                             |
|   4 | The system prevents circular hierarchy relationships.                                                         |
|   5 | The system prevents an organization unit from being assigned as its own parent.                               |
|   6 | Employees can be linked to organization units through employee assignment records.                            |
|   7 | Positions can be created and assigned to organization units.                                                  |
|   8 | Position status can be identified as filled, vacant, planned, frozen, or closed.                              |
|   9 | Direct manager and dotted-line manager relationships can be maintained.                                       |
|  10 | Matrix reporting relationships can be maintained where enabled.                                               |
|  11 | Organization structure can be viewed as an org chart.                                                         |
|  12 | Reporting structure can be viewed by employee, manager, department, or position.                              |
|  13 | Department headcount and vacant positions are visible.                                                        |
|  14 | Organization changes support effective dates.                                                                 |
|  15 | Previous organization structures remain historically traceable.                                               |
|  16 | Future-dated organization changes can be prepared without changing the current structure immediately.         |
|  17 | Approval workflows can resolve manager and escalation paths from the hierarchy.                               |
|  18 | Unauthorized users cannot modify organization hierarchy data.                                                 |
|  19 | Every organization hierarchy change creates an audit event.                                                   |
|  20 | Organization chart data can be filtered by company, business unit, department, manager, location, and status. |
