# Compensation Planning & Modeling

## Definition

**Compensation Planning & Modeling is the HRM function that plans, models, reviews, approves, and controls employee compensation changes, including salary adjustments, merit increases, promotion increases, market adjustments, total compensation packages, budget pools, compensation scenarios, and approval workflows.**

---

# Compensation Planning & Modeling Includes

| Area                               | What It Covers                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| **Compensation Cycle Planning**    | Annual salary review, mid-year review, promotion cycle, adjustment cycle                    |
| **Budget Pool Management**         | Salary increase budget, merit budget, promotion budget, bonus budget reference              |
| **Merit Increase Planning**        | Performance-based salary increase recommendation                                            |
| **Salary Adjustment Modeling**     | Salary correction, market adjustment, equity adjustment, retention adjustment               |
| **Promotion Increase Modeling**    | Salary change linked to promotion, grade change, job level change                           |
| **Total Compensation Modeling**    | Base salary, allowances, bonus reference, incentives, benefits, employer cost               |
| **Compensation Scenario Modeling** | What-if salary scenarios, proposed increase, revised package, budget impact                 |
| **Compensation Eligibility**       | Eligibility by employment type, grade, performance rating, tenure, department, legal entity |
| **Salary Structure Reference**     | Grade range, salary band, minimum, midpoint, maximum, compa-ratio reference                 |
| **Pay Equity Reference**           | Internal equity comparison, pay gap indicator, exception flag                               |
| **Market Benchmark Reference**     | External salary benchmark reference, market percentile reference                            |
| **Manager Recommendation**         | Proposed salary adjustment, justification, manager comments                                 |
| **HR Review**                      | HR validation, salary band check, equity check, policy compliance check                     |
| **Approval Workflow**              | Manager, department head, HR, finance, executive approval                                   |
| **Budget Control**                 | Budget utilization, remaining budget, over-budget warning, approval override                |
| **Compensation Letter Reference**  | Salary revision letter, promotion letter, adjustment letter                                 |
| **Payroll Integration**            | Approved salary change effective date and payroll update reference                          |
| **Compensation Audit Trail**       | Proposed by, reviewed by, approved by, rejected by, effective date, reason, timestamp       |

---

# Compensation Planning & Modeling Does Not Include

| Excluded Area                       | Owned By                                |
| ----------------------------------- | --------------------------------------- |
| Employee master profile             | Employee Records Management             |
| Employee job and assignment record  | Employee Records / Organizational Chart |
| Payroll calculation                 | Payroll Processing                      |
| Payroll run finalization            | Payroll Processing                      |
| Bonus calculation execution         | Bonus & Incentive Management            |
| Benefits enrollment                 | Benefits Administration                 |
| Expense claims                      | Expense Reimbursement                   |
| Salary survey data source ownership | Salary Benchmarking & Surveys           |
| Performance review scoring          | Performance Management                  |
| Promotion lifecycle workflow        | Employee Lifecycle Management           |
| Finance budget ownership            | Finance / Budgeting                     |
| General ledger posting              | Finance / Accounting                    |
| Employment contract storage         | Document Management                     |

---

# Compensation Planning & Modeling Requirement Statement

| Requirement                          | Description                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compensation Planning & Modeling** | Models salary adjustments, merit increases, promotion increases, market corrections, equity adjustments, and total compensation packages within defined budget pools, with eligibility rules, salary structure references, scenario modeling, approval workflow, payroll integration, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-CPM-001** | System shall create and manage compensation planning cycles.                                                                                                      |
| **HRM-CPM-002** | System shall define compensation cycle type such as annual review, merit review, promotion review, market adjustment, equity adjustment, or retention adjustment. |
| **HRM-CPM-003** | System shall define compensation budget pools by legal entity, department, business unit, grade, location, or manager group.                                      |
| **HRM-CPM-004** | System shall assign eligible employees to a compensation planning cycle.                                                                                          |
| **HRM-CPM-005** | System shall determine compensation eligibility based on employment type, status, tenure, grade, job level, department, legal entity, and performance rating.     |
| **HRM-CPM-006** | System shall display current salary, current grade, current job level, department, manager, and effective date.                                                   |
| **HRM-CPM-007** | System shall display salary structure reference including salary band minimum, midpoint, maximum, and range position.                                             |
| **HRM-CPM-008** | System shall support merit increase recommendation.                                                                                                               |
| **HRM-CPM-009** | System shall support promotion-related salary increase recommendation.                                                                                            |
| **HRM-CPM-010** | System shall support market adjustment recommendation.                                                                                                            |
| **HRM-CPM-011** | System shall support equity adjustment recommendation.                                                                                                            |
| **HRM-CPM-012** | System shall support retention adjustment recommendation.                                                                                                         |
| **HRM-CPM-013** | System shall calculate proposed new salary based on increase amount or increase percentage.                                                                       |
| **HRM-CPM-014** | System shall calculate total compensation impact including base salary, allowances, bonus reference, benefits reference, and employer cost reference.             |
| **HRM-CPM-015** | System shall support what-if compensation scenarios before final approval.                                                                                        |
| **HRM-CPM-016** | System shall compare proposed salary against salary band minimum, midpoint, and maximum.                                                                          |
| **HRM-CPM-017** | System shall flag proposed salary below minimum or above maximum salary band.                                                                                     |
| **HRM-CPM-018** | System shall calculate compensation budget utilization.                                                                                                           |
| **HRM-CPM-019** | System shall flag over-budget recommendations.                                                                                                                    |
| **HRM-CPM-020** | System shall require justification for exceptions, over-budget increases, above-band increases, and special adjustments.                                          |
| **HRM-CPM-021** | System shall allow managers to submit compensation recommendations.                                                                                               |
| **HRM-CPM-022** | System shall allow HR to review, adjust, approve, return, or reject compensation recommendations.                                                                 |
| **HRM-CPM-023** | System shall route compensation recommendations through approval workflow.                                                                                        |
| **HRM-CPM-024** | System shall support approval routing by legal entity, department, amount, percentage, grade, manager, and budget impact.                                         |
| **HRM-CPM-025** | System shall lock approved compensation recommendations after final approval.                                                                                     |
| **HRM-CPM-026** | System shall generate approved salary change records with effective date.                                                                                         |
| **HRM-CPM-027** | System shall send approved compensation changes to Payroll Processing.                                                                                            |
| **HRM-CPM-028** | System shall link approved compensation changes to employee history.                                                                                              |
| **HRM-CPM-029** | System shall support compensation planning reports by department, manager, legal entity, grade, budget pool, and status.                                          |
| **HRM-CPM-030** | System shall maintain audit trail for compensation cycle creation, recommendation, adjustment, review, approval, rejection, exception, and payroll integration.   |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                           |
| --: | ----------------------------------------------------------------------------------------------------------------------------- |
|   1 | Compensation planning cycle can be created with cycle type, effective date, eligible population, and approval rules.          |
|   2 | Budget pool can be assigned by legal entity, department, business unit, grade, location, or manager group.                    |
|   3 | Eligible employees can be included in the compensation cycle.                                                                 |
|   4 | Ineligible employees are excluded or flagged based on eligibility rules.                                                      |
|   5 | Current salary, grade, job level, department, manager, and salary effective date are visible during planning.                 |
|   6 | Salary band minimum, midpoint, maximum, and range position are visible where configured.                                      |
|   7 | Manager can propose merit increase by amount or percentage.                                                                   |
|   8 | Manager can propose promotion, market, equity, or retention adjustment where authorized.                                      |
|   9 | System calculates proposed new salary automatically.                                                                          |
|  10 | System calculates budget impact of proposed compensation changes.                                                             |
|  11 | System flags recommendations that exceed the allocated budget.                                                                |
|  12 | System flags proposed salary below salary band minimum or above salary band maximum.                                          |
|  13 | Exception justification is required for over-budget or outside-band recommendations.                                          |
|  14 | HR can review, adjust, return, approve, or reject compensation recommendations.                                               |
|  15 | Compensation recommendation follows configured approval workflow.                                                             |
|  16 | Approved recommendations are locked from normal editing.                                                                      |
|  17 | Approved salary change creates an effective-dated compensation record.                                                        |
|  18 | Approved compensation change is sent to Payroll Processing.                                                                   |
|  19 | Approved compensation change is reflected in employee history.                                                                |
|  20 | Compensation planning reports can be generated by department, manager, legal entity, grade, budget pool, and approval status. |
|  21 | Unauthorized users cannot view or edit restricted compensation planning data.                                                 |
|  22 | Every compensation planning action creates an audit event.                                                                    |
