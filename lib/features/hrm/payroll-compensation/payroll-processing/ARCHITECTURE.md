# Payroll Processing

## Definition

**Payroll Processing is the HRM function that calculates, validates, approves, and produces employee pay, including wages, salaries, allowances, overtime, deductions, taxes, statutory contributions, employer contributions, net pay, payroll journals, and payment files across defined pay schedules and payroll structures.**

---

# Payroll Processing Includes

| Area                                   | What It Covers                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Payroll Calendar**                   | Pay period, pay date, cutoff date, payroll cycle, payroll schedule                               |
| **Pay Group Management**               | Monthly payroll, weekly payroll, bi-weekly payroll, contract payroll, executive payroll          |
| **Salary Calculation**                 | Basic salary, fixed salary, daily wage, hourly wage, prorated salary                             |
| **Allowance Calculation**              | Fixed allowance, variable allowance, transport allowance, meal allowance, housing allowance      |
| **Overtime Calculation**               | Overtime hours, overtime rate, rest day overtime, public holiday overtime                        |
| **Deduction Calculation**              | Unpaid leave, lateness, absence, loan deduction, advance deduction, penalty deduction            |
| **Tax Calculation Reference**          | Employee tax deduction, employer tax obligation, tax category reference                          |
| **Statutory Contribution Calculation** | Employee contribution, employer contribution, statutory deduction, statutory employer cost       |
| **Employer Contribution**              | Employer-side statutory, insurance, pension, benefit, levy, or fund contributions                |
| **Net Pay Calculation**                | Gross pay minus deductions, tax, and employee contributions                                      |
| **Payroll Input Collection**           | Attendance input, leave input, overtime input, claims input, commission input, manual adjustment |
| **Payroll Adjustment**                 | One-time earning, one-time deduction, correction, retroactive adjustment                         |
| **Proration**                          | New joiner proration, resignation proration, unpaid leave proration, salary change proration     |
| **Payroll Validation**                 | Missing data check, negative pay check, abnormal variance check, statutory readiness check       |
| **Payroll Approval**                   | Payroll review, approval workflow, payroll lock, payroll release                                 |
| **Payslip Generation**                 | Payslip preview, finalized payslip, employee payslip access                                      |
| **Payment Processing Reference**       | Bank payment file, payment batch, payment status, payment date                                   |
| **Payroll Journal Reference**          | Payroll journal, cost center allocation, finance posting reference                               |
| **Payroll Audit Trail**                | Calculation run, adjustment, approval, release, payment, correction, timestamp, user             |

---

# Payroll Processing Does Not Include

| Excluded Area                                 | Owned By                                 |
| --------------------------------------------- | ---------------------------------------- |
| Employee master profile                       | Employee Records Management              |
| Organization hierarchy                        | Organizational Chart & Hierarchy         |
| Attendance clocking records                   | Time & Attendance                        |
| Leave application workflow                    | Leave Management                         |
| Expense claim submission                      | Expense Reimbursement                    |
| Benefits plan configuration                   | Benefits Administration                  |
| Bonus plan configuration                      | Bonus & Incentive Management             |
| Compensation budget planning                  | Compensation Planning & Modeling         |
| Market salary survey management               | Salary Benchmarking & Surveys            |
| Multi-country payroll rule library            | Multi-Country Payroll                    |
| Bank account master update request            | Employee Self-Service / Employee Records |
| Finance general ledger ownership              | Finance / Accounting                     |
| Payment gateway or bank integration ownership | Treasury / Finance Integration           |
| Tax filing submission workflow                | Tax / Statutory Reporting                |

---

# Payroll Processing Requirement Statement

| Requirement            | Description                                                                                                                                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Payroll Processing** | Calculates wages, salaries, allowances, overtime, deductions, taxes, statutory contributions, employer contributions, and net pay with support for multiple pay schedules, payroll structures, proration, adjustments, validation, approvals, payslip generation, payment files, payroll journals, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-PAY-001** | System shall create and maintain payroll cycles by pay group, pay period, cutoff date, and pay date.                                |
| **HRM-PAY-002** | System shall support multiple pay schedules including monthly, weekly, bi-weekly, semi-monthly, and ad hoc payroll.                 |
| **HRM-PAY-003** | System shall assign employees to payroll groups.                                                                                    |
| **HRM-PAY-004** | System shall calculate basic salary, hourly wages, daily wages, and fixed earnings.                                                 |
| **HRM-PAY-005** | System shall calculate fixed and variable allowances.                                                                               |
| **HRM-PAY-006** | System shall calculate overtime based on approved overtime inputs and configured rates.                                             |
| **HRM-PAY-007** | System shall calculate unpaid leave, absence, lateness, and other attendance-related deductions.                                    |
| **HRM-PAY-008** | System shall calculate employee tax deductions based on applicable tax configuration reference.                                     |
| **HRM-PAY-009** | System shall calculate employee statutory contributions.                                                                            |
| **HRM-PAY-010** | System shall calculate employer statutory contributions and employer payroll costs.                                                 |
| **HRM-PAY-011** | System shall support recurring earnings and recurring deductions.                                                                   |
| **HRM-PAY-012** | System shall support one-time earnings and one-time deductions.                                                                     |
| **HRM-PAY-013** | System shall support manual payroll adjustments with reason and approval reference.                                                 |
| **HRM-PAY-014** | System shall support salary proration for new joiners, resignations, unpaid leave, and mid-period salary changes.                   |
| **HRM-PAY-015** | System shall support retroactive payroll adjustments.                                                                               |
| **HRM-PAY-016** | System shall import or receive approved payroll inputs from attendance, leave, claims, benefits, commissions, and employee records. |
| **HRM-PAY-017** | System shall validate payroll readiness before payroll calculation.                                                                 |
| **HRM-PAY-018** | System shall flag missing employee payroll data before payroll run.                                                                 |
| **HRM-PAY-019** | System shall flag abnormal payroll variances compared with previous payroll cycles.                                                 |
| **HRM-PAY-020** | System shall prevent payroll finalization when blocking validation errors exist.                                                    |
| **HRM-PAY-021** | System shall support payroll preview before final approval.                                                                         |
| **HRM-PAY-022** | System shall support payroll approval workflow.                                                                                     |
| **HRM-PAY-023** | System shall lock payroll after final approval.                                                                                     |
| **HRM-PAY-024** | System shall generate employee payslips after payroll finalization.                                                                 |
| **HRM-PAY-025** | System shall support payslip access through Employee Self-Service.                                                                  |
| **HRM-PAY-026** | System shall generate payment batch or bank payment file.                                                                           |
| **HRM-PAY-027** | System shall track payroll payment status.                                                                                          |
| **HRM-PAY-028** | System shall generate payroll journal entries or finance posting references.                                                        |
| **HRM-PAY-029** | System shall support payroll correction or reversal with authorization.                                                             |
| **HRM-PAY-030** | System shall maintain audit trail for payroll calculation, adjustment, approval, finalization, payment, correction, and reversal.   |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                      |
| --: | ------------------------------------------------------------------------------------------------------------------------ |
|   1 | Payroll cycle can be created with pay group, period start, period end, cutoff date, and pay date.                        |
|   2 | Employees can be assigned to payroll groups.                                                                             |
|   3 | Payroll can calculate basic salary, allowances, overtime, deductions, taxes, and statutory contributions.                |
|   4 | Payroll can calculate employer contributions and employer payroll cost.                                                  |
|   5 | Payroll supports monthly, weekly, bi-weekly, semi-monthly, and ad hoc pay schedules where enabled.                       |
|   6 | Payroll supports salary proration for new joiners, resignations, unpaid leave, and mid-period salary changes.            |
|   7 | Payroll accepts approved inputs from attendance, leave, claims, benefits, and commissions.                               |
|   8 | Payroll flags employees with missing mandatory payroll data.                                                             |
|   9 | Payroll flags abnormal salary variance compared with previous payroll cycle.                                             |
|  10 | Payroll cannot be finalized when blocking validation errors exist.                                                       |
|  11 | Payroll preview can be reviewed before approval.                                                                         |
|  12 | Payroll approval workflow can be completed before finalization.                                                          |
|  13 | Finalized payroll becomes locked from normal editing.                                                                    |
|  14 | Payslips are generated after payroll finalization.                                                                       |
|  15 | Employees can access authorized payslips through Employee Self-Service.                                                  |
|  16 | Payroll payment batch or bank payment file can be generated.                                                             |
|  17 | Payroll payment status can be tracked.                                                                                   |
|  18 | Payroll journal or finance posting reference can be generated.                                                           |
|  19 | Payroll correction or reversal requires authorization.                                                                   |
|  20 | Every payroll calculation, adjustment, approval, finalization, payment, correction, and reversal creates an audit event. |
