# Multi-Country Payroll

## Definition

**Multi-Country Payroll is the HRM function that supports payroll processing across different countries, legal entities, currencies, languages, tax rules, statutory deductions, employer contributions, filing requirements, payroll calendars, and local employment regulations.**

---

# Multi-Country Payroll Includes

| Area                                | What It Covers                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Country Payroll Configuration**   | Country-specific payroll rules, statutory settings, contribution rules, tax rules                          |
| **Legal Entity Payroll Setup**      | Employing entity, registration number, statutory employer account, payroll country                         |
| **Local Tax Rules**                 | Employee tax deduction, employer tax obligation, tax category, tax residency reference                     |
| **Statutory Contributions**         | Pension, social security, unemployment insurance, healthcare, provident fund, levy, mandatory funds        |
| **Employer Contributions**          | Employer-side statutory cost, insurance, pension, levy, payroll tax, local employer obligations            |
| **Local Pay Components**            | Country-specific earnings, allowances, deductions, benefits, reimbursements, taxable/non-taxable treatment |
| **Currency Handling**               | Local currency payroll, foreign currency reference, exchange rate reference, payroll reporting currency    |
| **Payroll Calendar by Country**     | Country-specific pay periods, public holidays, cutoff dates, statutory filing dates                        |
| **Country-Specific Proration**      | New joiner, termination, unpaid leave, mid-period salary change, statutory proration rules                 |
| **Country-Specific Overtime Rules** | Overtime rate, rest day rate, public holiday rate, statutory working-hour limits                           |
| **Country-Specific Leave Impact**   | Paid leave, unpaid leave, statutory leave, maternity/paternity leave payroll treatment                     |
| **Statutory Reporting**             | Local payroll reports, statutory forms, contribution reports, tax reports, year-end reports                |
| **Mandatory Filing**                | Tax filing, contribution filing, employer declaration, employee income statement filing                    |
| **Local Payslip Format**            | Country-required payslip fields, language, currency, statutory breakdown                                   |
| **Compliance Validation**           | Local minimum wage, contribution ceiling, tax threshold, eligibility rules, filing readiness               |
| **Localization Support**            | Local language, date format, address format, tax ID format, statutory ID format                            |
| **Payroll Vendor Integration**      | Local payroll provider file, statutory portal export, bank file by country                                 |
| **Audit Trail**                     | Country rule version, calculation basis, statutory submission, filing status, approval, timestamp          |

---

# Multi-Country Payroll Does Not Include

| Excluded Area                                    | Owned By                           |
| ------------------------------------------------ | ---------------------------------- |
| Core payroll calculation run                     | Payroll Processing                 |
| Employee master profile                          | Employee Records Management        |
| Employee tax ID storage                          | Employee Records / Payroll Profile |
| Payroll approval workflow                        | Payroll Processing                 |
| Payslip generation process                       | Payroll Processing                 |
| Benefits plan management                         | Benefits Administration            |
| Expense claim processing                         | Expense Reimbursement              |
| Bonus plan configuration                         | Bonus & Incentive Management       |
| Compensation budgeting                           | Compensation Planning & Modeling   |
| Market salary survey comparison                  | Salary Benchmarking & Surveys      |
| Leave application workflow                       | Leave Management                   |
| Attendance records                               | Time & Attendance                  |
| Local legal advisory decision-making             | Legal / Compliance                 |
| Government portal submission outside integration | Compliance / Statutory Reporting   |
| Finance general ledger ownership                 | Finance / Accounting               |

---

# Multi-Country Payroll Requirement Statement

| Requirement               | Description                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-Country Payroll** | Supports payroll processing across multiple countries by maintaining country-specific payroll configurations, tax rules, statutory deductions, employer contributions, currencies, local pay components, payroll calendars, statutory reports, filing requirements, localized payslip requirements, compliance validations, and audit history. |

---

# Enterprise Functional Requirements

| Code            | Requirement                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HRM-MCP-001** | System shall support payroll configuration by country.                                                                                                      |
| **HRM-MCP-002** | System shall support payroll configuration by legal entity within each country.                                                                             |
| **HRM-MCP-003** | System shall maintain country-specific tax rule references.                                                                                                 |
| **HRM-MCP-004** | System shall maintain country-specific statutory contribution rules.                                                                                        |
| **HRM-MCP-005** | System shall maintain country-specific employer contribution rules.                                                                                         |
| **HRM-MCP-006** | System shall support country-specific earnings, allowances, deductions, and benefits treatment.                                                             |
| **HRM-MCP-007** | System shall classify pay components as taxable, non-taxable, contributable, non-contributable, pensionable, or non-pensionable according to country rules. |
| **HRM-MCP-008** | System shall support local payroll currency by country and legal entity.                                                                                    |
| **HRM-MCP-009** | System shall support exchange rate reference for reporting or cross-country consolidation.                                                                  |
| **HRM-MCP-010** | System shall support country-specific payroll calendars, cutoff dates, pay dates, public holidays, and statutory deadlines.                                 |
| **HRM-MCP-011** | System shall support country-specific proration rules.                                                                                                      |
| **HRM-MCP-012** | System shall support country-specific overtime and rest-day calculation rules.                                                                              |
| **HRM-MCP-013** | System shall support country-specific unpaid leave and statutory leave payroll treatment.                                                                   |
| **HRM-MCP-014** | System shall support country-specific tax residency, employee category, and statutory eligibility classifications.                                          |
| **HRM-MCP-015** | System shall validate employee statutory readiness before country payroll processing.                                                                       |
| **HRM-MCP-016** | System shall validate minimum wage, statutory ceiling, contribution threshold, and tax threshold where applicable.                                          |
| **HRM-MCP-017** | System shall generate country-specific statutory reports.                                                                                                   |
| **HRM-MCP-018** | System shall generate country-specific tax reports.                                                                                                         |
| **HRM-MCP-019** | System shall generate country-specific contribution reports.                                                                                                |
| **HRM-MCP-020** | System shall generate localized payslip fields required by country rules.                                                                                   |
| **HRM-MCP-021** | System shall support country-specific bank payment file formats where enabled.                                                                              |
| **HRM-MCP-022** | System shall support export files for statutory portals or local payroll vendors.                                                                           |
| **HRM-MCP-023** | System shall support country rule versioning.                                                                                                               |
| **HRM-MCP-024** | System shall preserve the rule version used for each finalized payroll calculation.                                                                         |
| **HRM-MCP-025** | System shall restrict modification of country statutory rules to authorized payroll administrators.                                                         |
| **HRM-MCP-026** | System shall support cross-country payroll reporting by legal entity, country, currency, pay group, and period.                                             |
| **HRM-MCP-027** | System shall support consolidated employer payroll cost reporting across countries.                                                                         |
| **HRM-MCP-028** | System shall maintain audit trail for country payroll setup, rule changes, statutory calculations, filing exports, and payroll localization changes.        |

---

# Enterprise Acceptance Criteria

| No. | Acceptance Criteria                                                                                                  |
| --: | -------------------------------------------------------------------------------------------------------------------- |
|   1 | Payroll country can be configured for each legal entity.                                                             |
|   2 | Each country can maintain its own payroll calendar, cutoff date, pay date, public holidays, and statutory deadlines. |
|   3 | Country-specific tax rules can be configured or referenced.                                                          |
|   4 | Country-specific statutory contribution rules can be configured or referenced.                                       |
|   5 | Country-specific employer contribution rules can be configured or referenced.                                        |
|   6 | Pay components can have different taxable and contributable treatment by country.                                    |
|   7 | Employees can be classified by tax residency, statutory eligibility, and local worker category.                      |
|   8 | Payroll validates employee statutory readiness before country payroll processing.                                    |
|   9 | Payroll validates minimum wage, contribution ceiling, tax threshold, and statutory eligibility where applicable.     |
|  10 | Payroll supports local payroll currency by country.                                                                  |
|  11 | Exchange rate reference is available for reporting or consolidation.                                                 |
|  12 | Country-specific proration rules can be applied.                                                                     |
|  13 | Country-specific overtime and leave payroll treatment can be applied.                                                |
|  14 | Country-specific statutory reports can be generated.                                                                 |
|  15 | Country-specific tax reports can be generated.                                                                       |
|  16 | Country-specific contribution reports can be generated.                                                              |
|  17 | Local payslip format displays required country-specific statutory fields.                                            |
|  18 | Country-specific bank payment or vendor export files can be generated where enabled.                                 |
|  19 | Finalized payroll stores the country rule version used for calculation.                                              |
|  20 | Cross-country payroll cost can be reported by country, legal entity, currency, pay group, and period.                |
|  21 | Unauthorized users cannot modify statutory payroll rules.                                                            |
|  22 | Every country payroll configuration, rule change, statutory calculation, and filing export creates an audit event.   |
