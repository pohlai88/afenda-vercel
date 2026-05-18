# Bonus & Incentive Management

## Definition

**Bonus & Incentive Management is the HRM function that configures, calculates, reviews, approves, and pays employee bonuses, commissions, incentives, variable pay, performance rewards, sales rewards, target-based payouts, and one-time recognition payments.**

---

# Bonus & Incentive Management Includes

| Area                          | What It Covers                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| **Bonus Plan Management**     | Annual bonus, performance bonus, discretionary bonus, fixed bonus, contractual bonus                |
| **Incentive Plan Management** | Sales incentive, project incentive, productivity incentive, retention incentive, referral incentive |
| **Commission Management**     | Sales commission, tiered commission, revenue-based commission, margin-based commission              |
| **Eligibility Rules**         | Eligibility by employment type, grade, role, department, sales team, tenure, performance rating     |
| **Bonus Cycle Management**    | Bonus period, incentive period, payout period, cutoff date, approval date, payment date             |
| **Target Management**         | Individual target, team target, sales target, revenue target, profit target, KPI target             |
| **Performance Linkage**       | Performance rating, KPI achievement, scorecard result, appraisal outcome                            |
| **Payout Formula**            | Fixed amount, percentage of salary, percentage of sales, achievement multiplier, tiered rate        |
| **Proration**                 | New joiner proration, resignation proration, unpaid leave proration, partial-period eligibility     |
| **Cap and Floor Rules**       | Minimum payout, maximum payout, guaranteed bonus, capped commission                                 |
| **Multiplier Rules**          | Company performance multiplier, department multiplier, individual performance multiplier            |
| **Quota Achievement**         | Target achievement percentage, overachievement, underachievement, accelerator rate                  |
| **Discretionary Adjustment**  | Management adjustment, HR adjustment, exceptional award, manual override                            |
| **Clawback / Recovery**       | Overpayment recovery, commission reversal, clawback rule, refund condition                          |
| **Approval Workflow**         | Manager review, HR review, finance review, executive approval                                       |
| **Payroll Integration**       | Approved bonus and incentive payout sent to Payroll Processing                                      |
| **Accounting Allocation**     | Cost center, department, project, sales region, legal entity, GL reference                          |
| **Reporting**                 | Bonus report, commission report, incentive payout report, variance report                           |
| **Audit Trail**               | Plan configured by, calculated by, reviewed by, approved by, adjusted by, paid by, timestamp        |

---

# Bonus & Incentive Management Does Not Include

| Excluded Area                                | Owned By                                     |
| -------------------------------------------- | -------------------------------------------- |
| Employee master profile                      | Employee Records Management                  |
| Employee job / grade / department assignment | Employee Records / Organizational Chart      |
| Payroll run calculation                      | Payroll Processing                           |
| Payroll finalization                         | Payroll Processing                           |
| Salary adjustment planning                   | Compensation Planning & Modeling             |
| Benefits enrollment                          | Benefits Administration                      |
| Expense claims                               | Expense Reimbursement                        |
| Sales order ownership                        | Sales / CRM                                  |
| Revenue recognition                          | Finance / Accounting                         |
| Performance review scoring                   | Performance Management                       |
| KPI framework configuration                  | Performance Management / Strategy Management |
| General ledger ownership                     | Finance / Accounting                         |
| Market salary comparison                     | Salary Benchmarking & Surveys                |
| Tax and statutory rule ownership             | Payroll / Multi-Country Payroll              |

---

# Bonus & Incentive Management Requirement Statement

| Requirement                      | Description                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bonus & Incentive Management** | Configures and calculates performance-based bonuses, commissions, incentives, variable pay, target-based rewards, discretionary payouts, and recognition payments with eligibility rules, payout formulas, proration, approval workflow, payroll integration, reporting, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-BON-001** | System shall create and maintain bonus and incentive plans.                                                                                                                                                                  |
| **HRM-BON-002** | System shall support plan types including annual bonus, performance bonus, discretionary bonus, contractual bonus, sales commission, project incentive, productivity incentive, retention incentive, and referral incentive. |
| **HRM-BON-003** | System shall define eligibility rules by legal entity, department, grade, job role, employment type, tenure, performance rating, sales team, and employee status.                                                            |
| **HRM-BON-004** | System shall assign eligible employees to bonus or incentive plans.                                                                                                                                                          |
| **HRM-BON-005** | System shall define bonus and incentive cycles with period start, period end, cutoff date, approval date, and payout date.                                                                                                   |
| **HRM-BON-006** | System shall support individual, team, department, company, sales, revenue, profit, project, and KPI targets.                                                                                                                |
| **HRM-BON-007** | System shall capture actual achievement against defined targets.                                                                                                                                                             |
| **HRM-BON-008** | System shall calculate achievement percentage against target.                                                                                                                                                                |
| **HRM-BON-009** | System shall support payout formulas based on fixed amount, percentage of salary, percentage of sales, revenue, margin, KPI score, or performance rating.                                                                    |
| **HRM-BON-010** | System shall support tiered commission rates.                                                                                                                                                                                |
| **HRM-BON-011** | System shall support accelerator rates for overachievement.                                                                                                                                                                  |
| **HRM-BON-012** | System shall support payout caps and payout floors.                                                                                                                                                                          |
| **HRM-BON-013** | System shall support guaranteed bonus rules where applicable.                                                                                                                                                                |
| **HRM-BON-014** | System shall support company, department, team, and individual performance multipliers.                                                                                                                                      |
| **HRM-BON-015** | System shall support bonus proration for new joiners, resignations, unpaid leave, and partial-period eligibility.                                                                                                            |
| **HRM-BON-016** | System shall support manual adjustment with justification and approval reference.                                                                                                                                            |
| **HRM-BON-017** | System shall support discretionary bonus recommendations.                                                                                                                                                                    |
| **HRM-BON-018** | System shall support commission reversal, payout correction, overpayment recovery, and clawback reference where applicable.                                                                                                  |
| **HRM-BON-019** | System shall validate bonus and incentive eligibility before payout calculation.                                                                                                                                             |
| **HRM-BON-020** | System shall flag missing targets, missing achievement data, incomplete performance rating, and invalid payout formula.                                                                                                      |
| **HRM-BON-021** | System shall route bonus and incentive payouts through approval workflow.                                                                                                                                                    |
| **HRM-BON-022** | System shall support approval routing by plan type, amount, department, legal entity, employee grade, manager, and budget impact.                                                                                            |
| **HRM-BON-023** | System shall allow approvers to approve, reject, return, or adjust bonus and incentive payouts based on permission.                                                                                                          |
| **HRM-BON-024** | System shall require reason for rejected or adjusted payouts.                                                                                                                                                                |
| **HRM-BON-025** | System shall lock approved bonus and incentive payouts after final approval.                                                                                                                                                 |
| **HRM-BON-026** | System shall send approved bonus, commission, and incentive payouts to Payroll Processing.                                                                                                                                   |
| **HRM-BON-027** | System shall support accounting allocation by legal entity, department, cost center, project, sales region, and GL reference.                                                                                                |
| **HRM-BON-028** | System shall provide bonus, commission, incentive, payout variance, and eligibility reports.                                                                                                                                 |
| **HRM-BON-029** | System shall restrict bonus and incentive data based on employee, manager, HR, finance, executive, and auditor permissions.                                                                                                  |
| **HRM-BON-030** | System shall maintain audit trail for plan setup, eligibility, target input, achievement input, calculation, adjustment, approval, rejection, payroll integration, correction, and clawback actions.                         |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                                   |
| --: | ------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Bonus or incentive plan can be created with plan type, eligibility rules, payout formula, cycle period, and payment date.             |
|   2 | Plan eligibility can be determined by employment type, grade, role, department, legal entity, tenure, status, and performance rating. |
|   3 | Eligible employees can be assigned to bonus or incentive plans.                                                                       |
|   4 | Ineligible employees are excluded or flagged.                                                                                         |
|   5 | Bonus and incentive cycle can be configured with start date, end date, cutoff date, approval date, and payout date.                   |
|   6 | Individual, team, department, company, sales, revenue, profit, project, or KPI targets can be recorded.                               |
|   7 | Actual achievement can be recorded against target.                                                                                    |
|   8 | Achievement percentage is calculated automatically.                                                                                   |
|   9 | Payout can be calculated using fixed amount, salary percentage, sales percentage, revenue, margin, KPI score, or performance rating.  |
|  10 | Tiered commission rates can be applied.                                                                                               |
|  11 | Accelerator rates can be applied for overachievement.                                                                                 |
|  12 | Payout cap and payout floor can be enforced.                                                                                          |
|  13 | Bonus proration can be applied for new joiners, resignations, unpaid leave, or partial eligibility period.                            |
|  14 | Manual adjustment requires justification and authorization.                                                                           |
|  15 | Missing target, achievement, rating, or formula data is flagged before calculation finalization.                                      |
|  16 | Bonus and incentive payout follows configured approval workflow.                                                                      |
|  17 | Approver can approve, reject, return, or adjust payout where authorized.                                                              |
|  18 | Rejected or adjusted payout stores reason.                                                                                            |
|  19 | Approved payout is locked from normal editing.                                                                                        |
|  20 | Approved payout is sent to Payroll Processing for payment.                                                                            |
|  21 | Accounting allocation can be assigned by legal entity, department, cost center, project, sales region, and GL reference.              |
|  22 | Commission reversal, payout correction, overpayment recovery, or clawback can be recorded where applicable.                           |
|  23 | Bonus and incentive reports can be generated by plan, employee, department, legal entity, manager, status, and period.                |
|  24 | Unauthorized users cannot view or edit restricted bonus and incentive data.                                                           |
|  25 | Every plan setup, calculation, adjustment, approval, rejection, payroll integration, correction, and clawback creates an audit event. |
