# Expense Reimbursement

## Definition

**Expense Reimbursement is the HRM function that processes employee expense claims, including claim submission, receipt capture, expense categorization, policy validation, approval workflow, reimbursement calculation, payment integration, accounting allocation, and audit history.**

---

# Expense Reimbursement Includes

| Area                          | What It Covers                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| **Expense Claim Submission**  | Employee-submitted expense claims, claim form, claim date, claim amount                           |
| **Expense Categories**        | Travel, meals, transport, accommodation, fuel, parking, tolls, office supplies, medical, training |
| **Receipt Capture**           | Receipt upload, receipt image, invoice attachment, proof of payment                               |
| **Receipt Validation**        | Required receipt check, receipt date check, duplicate receipt check, readable receipt check       |
| **Expense Policy Validation** | Claim limit, category limit, daily limit, approval limit, eligible expense type                   |
| **Employee Eligibility**      | Eligibility by grade, department, employment type, location, legal entity, travel status          |
| **Currency Handling**         | Claim currency, reimbursement currency, exchange rate reference, foreign expense conversion       |
| **Tax Treatment Reference**   | Taxable reimbursement, non-taxable reimbursement, input tax reference, VAT/GST/SST reference      |
| **Mileage Reimbursement**     | Mileage claim, distance, rate per kilometer/mile, route reference                                 |
| **Travel Expense Claim**      | Flight, hotel, meals, transport, per diem, travel allowance reference                             |
| **Advance Offset**            | Cash advance reference, claim offset, balance payable, balance recoverable                        |
| **Approval Workflow**         | Manager approval, finance approval, HR approval, exception approval                               |
| **Policy Exception Handling** | Over-limit claim, missing receipt, late submission, non-standard expense                          |
| **Reimbursement Calculation** | Approved amount, rejected amount, reimbursable amount, deduction/offset amount                    |
| **Payment Integration**       | Payroll reimbursement, accounts payable payment, bank payment reference                           |
| **Accounting Allocation**     | Cost center, project, department, legal entity, GL account reference                              |
| **Claim Status Tracking**     | Draft, submitted, under review, approved, rejected, returned, paid, cancelled                     |
| **Audit Trail**               | Submitted by, approved by, rejected by, paid by, timestamp, reason, evidence                      |

---

# Expense Reimbursement Does Not Include

| Excluded Area                       | Owned By                                 |
| ----------------------------------- | ---------------------------------------- |
| Employee master profile             | Employee Records Management              |
| Employee bank account master update | Employee Records / Employee Self-Service |
| Payroll salary calculation          | Payroll Processing                       |
| Payroll run finalization            | Payroll Processing                       |
| Benefit plan management             | Benefits Administration                  |
| Corporate card management           | Finance / Treasury                       |
| Vendor invoice processing           | Accounts Payable                         |
| General ledger ownership            | Finance / Accounting                     |
| Travel booking management           | Travel Management / Procurement          |
| Budget planning                     | Finance / Budgeting                      |
| Tax rule configuration              | Finance / Tax / Multi-Country Payroll    |
| Document storage engine             | Document Management                      |
| Organization hierarchy              | Organizational Chart & Hierarchy         |
| Attendance and leave records        | Time & Attendance / Leave Management     |
| Compensation planning               | Compensation Planning & Modeling         |

---

# Expense Reimbursement Requirement Statement

| Requirement               | Description                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Expense Reimbursement** | Processes employee expense claims with receipt capture, expense categorization, policy validation, eligibility checks, approval workflow, exception handling, reimbursement calculation, payment integration, accounting allocation, claim status tracking, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **HRM-EXP-001** | System shall allow employees to create and submit expense reimbursement claims.                                                                              |
| **HRM-EXP-002** | System shall support expense claim categories such as travel, meals, accommodation, transport, fuel, parking, tolls, office supplies, medical, and training. |
| **HRM-EXP-003** | System shall allow employees to attach receipts, invoices, or proof of payment to expense claims.                                                            |
| **HRM-EXP-004** | System shall require receipt attachment for expense categories where receipt is mandatory.                                                                   |
| **HRM-EXP-005** | System shall capture expense date, claim amount, currency, category, description, and supporting document reference.                                         |
| **HRM-EXP-006** | System shall validate expense claims against configured expense policies.                                                                                    |
| **HRM-EXP-007** | System shall validate claim eligibility by employee grade, employment type, department, location, legal entity, and expense category.                        |
| **HRM-EXP-008** | System shall enforce category limits, daily limits, monthly limits, and claim amount limits where configured.                                                |
| **HRM-EXP-009** | System shall detect duplicate claims based on receipt, amount, date, merchant, or claim reference.                                                           |
| **HRM-EXP-010** | System shall support foreign currency expense claims.                                                                                                        |
| **HRM-EXP-011** | System shall apply exchange rate reference for foreign currency reimbursement.                                                                               |
| **HRM-EXP-012** | System shall support mileage reimbursement based on approved distance and rate.                                                                              |
| **HRM-EXP-013** | System shall support travel expense claims including flight, hotel, meals, transport, and per diem.                                                          |
| **HRM-EXP-014** | System shall support cash advance offset against submitted expense claims.                                                                                   |
| **HRM-EXP-015** | System shall calculate approved, rejected, reimbursable, and offset amounts.                                                                                 |
| **HRM-EXP-016** | System shall route expense claims through approval workflow.                                                                                                 |
| **HRM-EXP-017** | System shall support approval routing by manager, department, cost center, amount, category, project, and legal entity.                                      |
| **HRM-EXP-018** | System shall allow approvers to approve, reject, return, or request clarification on expense claims.                                                         |
| **HRM-EXP-019** | System shall require rejection reason for rejected claims.                                                                                                   |
| **HRM-EXP-020** | System shall support exception approval for over-limit, late, missing-receipt, or non-standard claims.                                                       |
| **HRM-EXP-021** | System shall track claim status from draft to paid or cancelled.                                                                                             |
| **HRM-EXP-022** | System shall integrate approved reimbursements with Payroll Processing or Accounts Payable for payment.                                                      |
| **HRM-EXP-023** | System shall generate reimbursement payment reference after payment processing.                                                                              |
| **HRM-EXP-024** | System shall support accounting allocation by legal entity, department, cost center, project, and GL account.                                                |
| **HRM-EXP-025** | System shall provide expense claim reports by employee, department, category, cost center, project, status, and period.                                      |
| **HRM-EXP-026** | System shall restrict access to expense claims based on employee, manager, finance, HR, and auditor permissions.                                             |
| **HRM-EXP-027** | System shall notify employees and approvers of submitted, approved, rejected, returned, overdue, and paid claims.                                            |
| **HRM-EXP-028** | System shall maintain audit trail for claim submission, receipt upload, validation, approval, rejection, return, exception, payment, and cancellation.       |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                      |
| --: | -------------------------------------------------------------------------------------------------------- |
|   1 | Employee can create and submit an expense reimbursement claim.                                           |
|   2 | Expense claim requires expense date, category, amount, currency, and description.                        |
|   3 | Receipt can be attached to an expense claim.                                                             |
|   4 | Receipt is mandatory where expense policy requires it.                                                   |
|   5 | Expense category can be selected from configured claim categories.                                       |
|   6 | Claim eligibility is validated based on employee profile and policy rules.                               |
|   7 | Claim amount is validated against configured category, daily, monthly, or per-claim limits.              |
|   8 | Duplicate claims are flagged for review.                                                                 |
|   9 | Foreign currency claim can be converted using exchange rate reference.                                   |
|  10 | Mileage claim can be calculated using distance and approved mileage rate.                                |
|  11 | Cash advance can be offset against approved claim amount.                                                |
|  12 | Claim can be routed to manager, finance, HR, or exception approver based on policy.                      |
|  13 | Approver can approve, reject, return, or request clarification.                                          |
|  14 | Rejected claim stores rejection reason.                                                                  |
|  15 | Over-limit or missing-receipt claim requires exception approval.                                         |
|  16 | Approved claim calculates reimbursable amount.                                                           |
|  17 | Approved reimbursement can be sent to Payroll or Accounts Payable for payment.                           |
|  18 | Payment reference can be recorded after reimbursement payment.                                           |
|  19 | Accounting allocation can be assigned by cost center, department, project, legal entity, and GL account. |
|  20 | Claim status is visible to employee and authorized approvers.                                            |
|  21 | Expense reports can be generated by employee, department, category, status, and period.                  |
|  22 | Unauthorized users cannot view or modify restricted expense claims.                                      |
|  23 | Notifications are sent for submitted, approved, rejected, returned, overdue, and paid claims.            |
|  24 | Every expense claim action creates an audit event.                                                       |
