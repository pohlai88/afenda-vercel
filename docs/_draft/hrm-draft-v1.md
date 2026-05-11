# Afenda HRM — Senior Engineering Architecture Proposal

## North star

Afenda HRM should not behave like a lightweight HR SaaS bolted onto ERP. It should be a **workforce truth sub-ledger** inside Afenda’s ERP truth engine.

Every HRM decision should follow this chain:

```txt
Proposed workforce fact
→ validation
→ policy evaluation
→ approval route
→ evidence capture
→ immutable audit event
→ canonical record update
→ downstream ERP event
```

That means HRM owns **workforce truth**: who works for the organization, under what terms, from which effective date, governed by which policy, approved by whom, supported by which evidence, and reflected in which payroll, accounting, compliance, and document records.

I’m assuming Afenda’s current baseline is:

```txt
Next.js App Router
+ server-first UI
+ tRPC
+ Drizzle ORM
+ PostgreSQL
+ policy engine
+ approval engine
+ evidence model
+ audit ledger
+ multi-tenant ERP module structure
```

---

# 1. Product architecture

## 1.1 Core HRM domains

Afenda HRM should be organized around **canonical HR facts**, not UI features.

| Domain                     | What it owns                                                                                           | Canonical records                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| **Workforce Master**       | Employee identity, employee number, status, legal entity, manager, lifecycle state                     | Employees, employment status, reporting line                          |
| **Organization Structure** | Departments, positions, grades, reporting hierarchy                                                    | Departments, positions, job grades                                    |
| **Employment Lifecycle**   | Hiring, contracts, probation, confirmation, salary changes, transfers, resignation, termination        | Contracts, contract revisions, employment events                      |
| **Leave & Absence**        | Entitlement, accrual, leave requests, leave approvals, balance evidence                                | Leave entitlements, leave requests, leave balances                    |
| **Attendance & Time**      | Raw clock events, schedules, attendance exceptions, corrections, daily summaries                       | Attendance events, attendance adjustments, daily attendance summaries |
| **Payroll Preparation**    | Payroll profile, statutory identifiers, pay inputs, statutory contribution evidence, payroll readiness | Payroll profiles, payroll snapshots, statutory evidence               |
| **Claims & Benefits**      | Employee claims, reimbursement evidence, benefits eligibility and enrollment                           | Claims, claim lines, benefit enrollments                              |
| **Documents Vault**        | Contracts, letters, medical certs, tax forms, payslips, policy acknowledgements                        | HR documents, document links, evidence packs                          |
| **Approvals**              | Workflow routing, approval decisions, escalation, delegation                                           | Approval requests, steps, actions                                     |
| **Compliance Rules**       | Country rules, state holidays, statutory rates, policy versions                                        | Country statutory rules, rate tables, rule versions                   |
| **Audit & Evidence**       | Immutable HR events, policy traces, decision evidence                                                  | HR audit events, compliance evidence                                  |

The flagship value is not “employee profile pages.” The value is **audit-ready workforce truth**.

---

## 1.2 Module boundaries

### HRM owns

HRM should own:

```txt
Employee master data
Employment contract state
Leave entitlement and requests
Attendance evidence
Payroll-relevant employee facts
Claims and benefits employee-side evidence
HR document links
HR policy evaluations
HR audit timeline
```

### HRM should not fully own

| Area                            | Owner module        | HRM relationship                                                          |
| ------------------------------- | ------------------- | ------------------------------------------------------------------------- |
| **General ledger**              | Accounting          | HRM sends approved payroll and claim posting requests                     |
| **Cash disbursement**           | Finance / Payments  | HRM produces payroll or claim payable evidence; finance pays              |
| **Procurement vendors**         | Procurement         | HRM references vendors for benefits, insurance, training providers        |
| **Document storage primitives** | Documents module    | HRM links documents to employees and evidence packs                       |
| **Generic approvals**           | Approval module     | HRM creates approval requests with HR-specific context                    |
| **Generic notifications**       | Notification module | HRM emits events; notification module delivers email/in-app/WhatsApp/etc. |
| **Global audit ledger**         | Audit module        | HRM writes domain-specific HR audit events into global ledger pattern     |

---

## 1.3 MVP vs enterprise-grade scope

### MVP scope

The MVP should prove that HRM is a **truth engine**, not just CRUD.

| Area                             | MVP                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| Employee master                  | Create, edit, archive, view timeline                                                       |
| Contracts                        | Effective-dated employment contract with probation and salary fields                       |
| Departments / positions / grades | Basic org setup                                                                            |
| Leave                            | Annual leave, sick leave, unpaid leave, public holiday awareness                           |
| Attendance                       | Manual clock-in/out, correction request, daily summary                                     |
| Approvals                        | Leave approval, attendance correction approval, salary change approval                     |
| Documents                        | Upload/link contract, medical cert, resignation letter                                     |
| Audit                            | Immutable audit event for every mutation                                                   |
| Evidence                         | Evidence pack for leave, attendance correction, employment changes                         |
| Malaysia compliance              | EPF/SOCSO/EIS/PCB profile fields, public holiday calendar, statutory evidence placeholders |
| Payroll prep                     | Payroll readiness console, not necessarily final disbursement                              |

### Enterprise-grade scope

| Area            | Enterprise scope                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Employee master | Multi-legal-entity employment, secondments, transfers, rehire history                            |
| Contracts       | Contract templates, digital signing, clause versioning                                           |
| Leave           | Accrual policies, carry-forward, encashment, replacement leave, time-off-in-lieu                 |
| Attendance      | Shifts, rosters, biometric integrations, geofencing, overtime rules                              |
| Payroll         | Full payroll runs, bank files, statutory submission files, payslips, GL posting                  |
| Claims          | Multi-currency, mileage, per diem, receipt OCR review, reimbursement batches                     |
| Benefits        | Insurance, medical, allowance plans, eligibility rules                                           |
| Compliance      | Multi-country statutory packs for Malaysia, Singapore, Indonesia, Thailand, Vietnam, Philippines |
| Audit           | Tamper-evident hash chain, retention policies, auditor export                                    |
| Security        | Field-level permissions, salary privacy, tenant RLS, legal-entity scopes                         |
| Integrations    | Accounting, bank, tax, statutory portals, biometric devices, document signing                    |

---

## 1.4 How HRM connects to other Afenda ERP systems

```txt
HRM
 ├── Finance
 │    ├── payroll payable request
 │    ├── claim reimbursement request
 │    └── employee bank/payment evidence
 │
 ├── Accounting
 │    ├── payroll journal draft
 │    ├── employer statutory contribution accrual
 │    └── department / cost center allocation
 │
 ├── Procurement
 │    ├── benefits vendors
 │    ├── training providers
 │    └── HR service purchase requests
 │
 ├── Approvals
 │    ├── leave approval
 │    ├── attendance correction approval
 │    ├── salary change approval
 │    ├── termination approval
 │    └── payroll run approval
 │
 ├── Documents
 │    ├── employment contracts
 │    ├── medical certificates
 │    ├── resignation letters
 │    ├── statutory reports
 │    └── payslips / EA forms later
 │
 ├── Audit
 │    ├── HR audit events
 │    ├── policy evaluation traces
 │    └── evidence pack hashes
 │
 └── Notifications
      ├── approval tasks
      ├── probation reminders
      ├── missing attendance alerts
      ├── payroll readiness alerts
      └── document expiry reminders
```

Use an **ERP outbox pattern** for cross-module integration:

```txt
HRM transaction commits
→ hr_audit_events written
→ erp_domain_events written
→ background dispatcher sends event to finance/accounting/notifications
```

This keeps HRM deterministic and prevents notification or integration failure from corrupting HR truth.

---

## 1.5 How HRM fits Afenda’s truth-engine model

HRM records should be classified as:

| Truth type                   | Example                                     | Storage pattern                |
| ---------------------------- | ------------------------------------------- | ------------------------------ |
| **Canonical fact**           | Employee hired on 2026-06-01                | Effective-dated table          |
| **Decision**                 | Leave approved by manager                   | Approval + audit event         |
| **Evidence**                 | Medical certificate attached                | Document + evidence pack       |
| **Derived fact**             | Annual leave balance                        | Calculation snapshot           |
| **External compliance fact** | EPF contribution evidence for payroll month | Compliance evidence            |
| **Projection**               | Dashboard headcount count                   | Cached/read model, rebuildable |

Rule: **Only canonical facts, decisions, and evidence are durable truth. Dashboards are projections.**

---

# 2. Technical architecture

## 2.1 Recommended folder/module structure

Use a vertical-slice structure, but keep shared ERP primitives separate.

```txt
src/
  app/
    (erp)/
      [orgSlug]/
        hrm/
          page.tsx
          employees/
            page.tsx
            new/
              page.tsx
            [employeeId]/
              page.tsx
              timeline/
                page.tsx
              documents/
                page.tsx
          leave/
            page.tsx
            requests/
              page.tsx
          attendance/
            page.tsx
          payroll/
            preparation/
              page.tsx
          approvals/
            page.tsx
          compliance/
            page.tsx
          documents/
            page.tsx
          policies/
            page.tsx

    api/
      trpc/
        [trpc]/
          route.ts

  modules/
    hrm/
      employees/
        employee.schema.ts
        employee.repository.ts
        employee.service.ts
        employee.router.ts
        employee.actions.ts
        employee.permissions.ts
        employee.events.ts
        employee.components.tsx

      employment/
        contract.schema.ts
        contract.repository.ts
        contract.service.ts
        contract.actions.ts

      org/
        department.service.ts
        position.service.ts
        grade.service.ts

      leave/
        leave.schema.ts
        leave.repository.ts
        leave.service.ts
        leave-entitlement.engine.ts
        leave.router.ts
        leave.actions.ts

      attendance/
        attendance.schema.ts
        attendance.repository.ts
        attendance.service.ts
        attendance-calculation.engine.ts
        attendance.actions.ts

      payroll/
        payroll-profile.service.ts
        payroll-preparation.service.ts
        statutory-calculation.boundary.ts
        malaysia/
          malaysia-payroll-rules.ts
          malaysia-statutory-rates.ts
          malaysia-public-holidays.ts

      claims/
        claim.service.ts
        claim.actions.ts

      benefits/
        benefit.service.ts

      documents/
        hr-document.service.ts

      compliance/
        statutory-rule.repository.ts
        statutory-rule.service.ts
        compliance-evidence.service.ts

      approvals/
        hr-approval.routes.ts

      audit/
        hr-audit.types.ts
        hr-audit-writer.ts

  server/
    db/
      client.ts
      schema/
        core.schema.ts
        hrm.schema.ts
        approvals.schema.ts
        documents.schema.ts
        audit.schema.ts
        compliance.schema.ts
      migrations/

    trpc/
      context.ts
      root-router.ts
      procedures.ts

    auth/
      session.ts
      rbac.ts
      permission-checks.ts
      scope-resolver.ts

    policy/
      policy-engine.ts
      policy-evaluation.repository.ts
      rule-registry.ts

    evidence/
      evidence-pack.service.ts
      evidence-object-store.ts

    audit/
      audit-ledger.service.ts

    workflow/
      approval-engine.ts
      route-resolver.ts

  lib/
    money.ts
    dates.ts
    ids.ts
    errors.ts
    result.ts
```

---

## 2.2 Server-first Next.js App Router design

Use **Server Components as the default** for ERP pages. The Next.js App Router is file-system based and uses modern React primitives including Server Components, Suspense, and Server Functions. ([Next.js][1])

Recommended pattern:

```txt
page.tsx
  → server component
  → loads scoped data directly from server service/query
  → renders dense ERP table shell

Client components
  → filters
  → command bar
  → dialogs
  → drawers
  → row selection
```

Example:

```tsx
// app/(erp)/[orgSlug]/hrm/employees/page.tsx
import { EmployeeMasterTable } from "@/modules/hrm/employees/employee.components"
import { employeeService } from "@/modules/hrm/employees/employee.service"
import { requireOrgContext } from "@/server/auth/session"

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const ctx = await requireOrgContext()
  const filters = await searchParams

  const employees = await employeeService.listEmployees(ctx, {
    status: filters.status,
    departmentId: filters.departmentId,
    q: filters.q,
  })

  return (
    <EmployeeMasterTable
      rows={employees.rows}
      total={employees.total}
      permissions={employees.permissions}
    />
  )
}
```

---

## 2.3 tRPC and Server Actions usage

Use a clear split:

| Use case                                        | Tool                                                      |
| ----------------------------------------------- | --------------------------------------------------------- |
| Server-rendered ERP pages                       | Direct server service calls                               |
| Client-side tables needing pagination/filtering | tRPC query                                                |
| Form submissions / mutations                    | Server Actions wrapping domain service                    |
| Public/programmatic internal API                | tRPC router                                               |
| Cross-module side effects                       | Domain events / outbox                                    |
| Uploads                                         | Server Action + document service                          |
| Approval actions                                | Server Action or tRPC mutation, both calling same service |

tRPC’s Next.js Server Actions integration supports validation, auth, authorization middleware, output validation, and transformers, but the docs mark that integration as experimental, so Afenda should use it selectively rather than building the whole HRM write layer around it. ([trpc.io][2])

Recommended rule:

```txt
No UI component writes directly to Drizzle.
No tRPC resolver contains business logic.
No Server Action contains business logic.
All writes go through domain services.
```

Example:

```tsx
// modules/hrm/leave/leave.actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { leaveService } from "./leave.service"
import { requireOrgContext } from "@/server/auth/session"
import { applyLeaveInput } from "./leave.schema"

export async function applyLeaveAction(rawInput: unknown) {
  const ctx = await requireOrgContext()
  const input = applyLeaveInput.parse(rawInput)

  const result = await leaveService.applyLeave(ctx, input)

  revalidatePath(`/${ctx.orgSlug}/hrm/leave`)
  revalidatePath(`/${ctx.orgSlug}/hrm/employees/${input.employeeId}/timeline`)

  return result
}
```

Use `revalidatePath` after mutations because it invalidates cached data for a specific page/layout path and can be called from Server Functions and Route Handlers. ([Next.js][3])

---

## 2.4 Drizzle + PostgreSQL architecture

Use Drizzle as the typed schema and query layer. Use PostgreSQL as the truth database.

Drizzle supports SQL transactions, including nested transaction savepoints, which is important for HRM because a canonical mutation must write the business row, approval/evidence references, domain event, and audit event atomically. ([orm.drizzle.team][4]) Drizzle’s index and constraint definitions should be used for everyday constraints, while more advanced PostgreSQL constraints, RLS, and exclusion constraints can live in raw SQL migrations. ([orm.drizzle.team][5])

Every tenant-scoped HRM table should include:

```txt
tenant_id
legal_entity_id where applicable
created_at
created_by
updated_at
updated_by
record_version
```

For effective-dated tables:

```txt
effective_from
effective_to
is_current
superseded_by_id
```

For compliance-sensitive tables:

```txt
evidence_pack_id
approval_request_id
policy_evaluation_id
locked_at
locked_by
```

---

## 2.5 Multi-tenant safety

Use both:

1. **Application-level permission checks**
2. **PostgreSQL Row-Level Security**

PostgreSQL RLS denies normal row access unless allowed by policy once row security is enabled, and if no policy exists, the default behavior is deny. ([PostgreSQL][6])

Recommended RLS pattern:

```sql
ALTER TABLE hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_employees FORCE ROW LEVEL SECURITY;

CREATE POLICY hr_employees_tenant_isolation
ON hr_employees
USING (
  tenant_id = current_setting('app.tenant_id', true)::uuid
)
WITH CHECK (
  tenant_id = current_setting('app.tenant_id', true)::uuid
);
```

Set the tenant context at request start:

```ts
await db.execute(sql`
  select set_config('app.tenant_id', ${ctx.tenantId}, true)
`)
```

Index rule:

```txt
Every tenant-scoped table index should usually begin with tenant_id.
For HRM, most important composite prefixes are:
tenant_id + legal_entity_id
tenant_id + employee_id
tenant_id + approval_status
tenant_id + effective_from/effective_to
```

---

## 2.6 Role-based access control

Use **RBAC + data scope**, not just role names.

### Core roles

| Role               | Scope                                                      |
| ------------------ | ---------------------------------------------------------- |
| Employee           | Own profile, own leave, own claims, own documents          |
| Manager            | Direct/indirect reports, approvals, team leave/attendance  |
| HR Officer         | Employee master except restricted payroll fields           |
| HR Admin           | HR configuration, policies, documents, lifecycle actions   |
| Payroll Preparer   | Payroll profiles, payroll readiness, statutory evidence    |
| Payroll Approver   | Payroll approval and locking                               |
| Finance Controller | Posting handoff, payroll liabilities, claim reimbursements |
| Auditor            | Read-only audit/evidence exports                           |
| Tenant Admin       | Configure roles, legal entities, integrations              |

### Permission naming

```txt
hrm.employee.read
hrm.employee.read.self
hrm.employee.compensation.read
hrm.employee.compensation.update
hrm.contract.create
hrm.leave.apply
hrm.leave.approve.team
hrm.attendance.correct
hrm.payroll.prepare
hrm.payroll.approve
hrm.compliance.evidence.read
hrm.policy.configure
hrm.audit.read
```

### Data scopes

```txt
self
direct_reports
department
legal_entity
country
tenant
```

Example:

```ts
await assertCan(ctx, "hrm.employee.compensation.update", {
  employeeId,
  legalEntityId,
  departmentId,
})
```

---

# 3. Database schema

## 3.1 Base conventions

Use UUID primary keys, tenant-scoped uniqueness, and append-only audit.

Recommended shared columns:

```ts
const baseColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedBy: uuid("updated_by"),
  recordVersion: integer("record_version").notNull().default(1),
}
```

For money, prefer integer minor units:

```txt
base_salary_minor = 500000
currency_code = MYR
meaning RM 5,000.00
```

This avoids decimal rounding bugs in payroll evidence.

---

## 3.2 Core Drizzle schema examples

### Employees

```ts
export const employeeStatus = pgEnum("employee_status", [
  "draft",
  "probation",
  "active",
  "confirmed",
  "resigned",
  "terminated",
  "suspended",
  "archived",
])

export const hrEmployees = pgTable(
  "hr_employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),

    employeeNo: text("employee_no").notNull(),
    officialName: text("official_name").notNull(),
    preferredName: text("preferred_name"),
    primaryWorkEmail: text("primary_work_email"),

    countryCode: text("country_code").notNull(), // MY, SG, ID, TH, VN, PH
    workStateCode: text("work_state_code"), // MY-SGR, MY-JHR, etc.

    status: employeeStatus("status").notNull().default("draft"),
    hireDate: date("hire_date").notNull(),
    confirmationDate: date("confirmation_date"),
    terminationDate: date("termination_date"),

    currentDepartmentId: uuid("current_department_id"),
    currentPositionId: uuid("current_position_id"),
    currentJobGradeId: uuid("current_job_grade_id"),
    managerEmployeeId: uuid("manager_employee_id"),

    evidencePackId: uuid("evidence_pack_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by"),
    recordVersion: integer("record_version").notNull().default(1),
  },
  (t) => ({
    employeeNoUq: uniqueIndex("hr_emp_tenant_legal_empno_uq").on(
      t.tenantId,
      t.legalEntityId,
      t.employeeNo
    ),
    statusIdx: index("hr_emp_status_idx").on(
      t.tenantId,
      t.legalEntityId,
      t.status
    ),
    managerIdx: index("hr_emp_manager_idx").on(t.tenantId, t.managerEmployeeId),
    departmentIdx: index("hr_emp_department_idx").on(
      t.tenantId,
      t.currentDepartmentId
    ),
    emailIdx: index("hr_emp_email_idx").on(t.tenantId, t.primaryWorkEmail),
  })
)
```

### Employment contracts

```ts
export const contractStatus = pgEnum("contract_status", [
  "draft",
  "pending_approval",
  "active",
  "superseded",
  "ended",
  "voided",
])

export const hrEmploymentContracts = pgTable(
  "hr_employment_contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    employeeId: uuid("employee_id").notNull(),

    contractNo: text("contract_no").notNull(),
    contractType: text("contract_type").notNull(), // permanent, fixed_term, intern, contractor
    status: contractStatus("status").notNull().default("draft"),

    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    probationEndDate: date("probation_end_date"),

    departmentId: uuid("department_id"),
    positionId: uuid("position_id"),
    jobGradeId: uuid("job_grade_id"),

    currencyCode: text("currency_code").notNull().default("MYR"),
    baseSalaryMinor: integer("base_salary_minor").notNull(),
    payFrequency: text("pay_frequency").notNull().default("monthly"),

    normalWorkingHoursPerWeek: numeric("normal_working_hours_per_week", {
      precision: 5,
      scale: 2,
    }),
    noticePeriodDays: integer("notice_period_days"),

    documentId: uuid("document_id"),
    approvalRequestId: uuid("approval_request_id"),
    evidencePackId: uuid("evidence_pack_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    employeeEffectiveIdx: index("hr_contract_employee_effective_idx").on(
      t.tenantId,
      t.employeeId,
      t.effectiveFrom
    ),
    contractNoUq: uniqueIndex("hr_contract_no_uq").on(
      t.tenantId,
      t.legalEntityId,
      t.contractNo
    ),
    approvalIdx: index("hr_contract_approval_idx").on(
      t.tenantId,
      t.approvalRequestId
    ),
  })
)
```

Add a raw SQL migration later to prevent overlapping active contracts for the same employee.

---

### Leave requests

```ts
export const leaveRequestStatus = pgEnum("leave_request_status", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "cancelled",
  "taken",
])

export const hrLeaveRequests = pgTable(
  "hr_leave_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    legalEntityId: uuid("legal_entity_id").notNull(),
    employeeId: uuid("employee_id").notNull(),

    leaveTypeCode: text("leave_type_code").notNull(), // annual, sick, unpaid, maternity, etc.
    status: leaveRequestStatus("status").notNull().default("draft"),

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalDays: numeric("total_days", { precision: 6, scale: 2 }).notNull(),

    reason: text("reason"),
    medicalDocumentId: uuid("medical_document_id"),

    approvalRequestId: uuid("approval_request_id"),
    policyEvaluationId: uuid("policy_evaluation_id"),
    evidencePackId: uuid("evidence_pack_id"),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by"),
  },
  (t) => ({
    employeeDateIdx: index("hr_leave_employee_date_idx").on(
      t.tenantId,
      t.employeeId,
      t.startDate,
      t.endDate
    ),
    statusIdx: index("hr_leave_status_idx").on(
      t.tenantId,
      t.legalEntityId,
      t.status
    ),
    typeIdx: index("hr_leave_type_idx").on(t.tenantId, t.leaveTypeCode),
  })
)
```

---

### Approvals

```ts
export const approvalStatus = pgEnum("approval_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
])

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    legalEntityId: uuid("legal_entity_id"),

    moduleCode: text("module_code").notNull(), // hrm
    objectType: text("object_type").notNull(), // leave_request, salary_change, etc.
    objectId: uuid("object_id").notNull(),

    status: approvalStatus("status").notNull().default("pending"),
    requestedBy: uuid("requested_by").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    routeCode: text("route_code").notNull(),
    routeVersion: integer("route_version").notNull(),

    currentStepNo: integer("current_step_no").notNull().default(1),
    snapshot: jsonb("snapshot").notNull(),

    evidencePackId: uuid("evidence_pack_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    inboxIdx: index("approval_inbox_idx").on(
      t.tenantId,
      t.status,
      t.currentStepNo
    ),
    objectIdx: index("approval_object_idx").on(
      t.tenantId,
      t.objectType,
      t.objectId
    ),
  })
)
```

---

### HR audit events

```ts
export const hrAuditEvents = pgTable(
  "hr_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    legalEntityId: uuid("legal_entity_id"),

    actorUserId: uuid("actor_user_id"),
    actorEmployeeId: uuid("actor_employee_id"),

    eventType: text("event_type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),

    action: text("action").notNull(),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    metadataJson: jsonb("metadata_json"),

    approvalRequestId: uuid("approval_request_id"),
    evidencePackId: uuid("evidence_pack_id"),
    policyEvaluationId: uuid("policy_evaluation_id"),

    requestId: text("request_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    previousHash: text("previous_hash"),
    eventHash: text("event_hash").notNull(),

    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    subjectIdx: index("hr_audit_subject_idx").on(
      t.tenantId,
      t.subjectType,
      t.subjectId
    ),
    actorIdx: index("hr_audit_actor_idx").on(t.tenantId, t.actorUserId),
    occurredIdx: index("hr_audit_occurred_idx").on(t.tenantId, t.occurredAt),
    hashIdx: uniqueIndex("hr_audit_hash_uq").on(t.tenantId, t.eventHash),
  })
)
```

---

## 3.3 Production schema table-by-table

## A. `hr_employees`

| Item             | Design                                                                                                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Canonical employee master record. Represents employment identity inside a legal entity.                                                                                                                                                                                            |
| Key fields       | `tenant_id`, `legal_entity_id`, `employee_no`, `official_name`, `preferred_name`, `status`, `hire_date`, `confirmation_date`, `termination_date`, `country_code`, `work_state_code`, `manager_employee_id`, `current_department_id`, `current_position_id`, `current_job_grade_id` |
| Relationships    | Legal entity, department, position, job grade, manager employee, payroll profile, contracts, documents, audit events                                                                                                                                                               |
| Indexing         | Unique `(tenant_id, legal_entity_id, employee_no)`, indexes on status, manager, department, work email                                                                                                                                                                             |
| Audit/compliance | No hard delete. Sensitive PII should be encrypted or stored in a protected profile table. Every change writes `hr_audit_events`.                                                                                                                                                   |

---

## B. `hr_employment_contracts`

| Item             | Design                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose          | Effective-dated employment terms. Supports hire, contract renewal, salary change, transfer, termination.                                                                                                                                   |
| Key fields       | `employee_id`, `contract_no`, `contract_type`, `status`, `effective_from`, `effective_to`, `probation_end_date`, `department_id`, `position_id`, `job_grade_id`, `base_salary_minor`, `currency_code`, `notice_period_days`, `document_id` |
| Relationships    | Employee, document, approval request, evidence pack, policy evaluation                                                                                                                                                                     |
| Indexing         | `(tenant_id, employee_id, effective_from)`, unique `(tenant_id, legal_entity_id, contract_no)`                                                                                                                                             |
| Audit/compliance | Contract changes should create a new version instead of overwriting old terms. Signed contracts should be locked and linked to document checksum.                                                                                          |

---

## C. `hr_departments`

| Item             | Design                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Department hierarchy for HR reporting, approvals, and cost allocation.                                                             |
| Key fields       | `department_code`, `name`, `parent_department_id`, `legal_entity_id`, `cost_center_id`, `status`, `effective_from`, `effective_to` |
| Relationships    | Employees, positions, finance cost centers, approval routes                                                                        |
| Indexing         | Unique `(tenant_id, legal_entity_id, department_code)`, parent hierarchy index                                                     |
| Audit/compliance | Effective-date restructures. Avoid overwriting historical department names used in past payroll evidence.                          |

---

## D. `hr_positions`

| Item             | Design                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose          | Defines roles/jobs in the organization.                                                                                              |
| Key fields       | `position_code`, `title`, `department_id`, `job_grade_id`, `reports_to_position_id`, `employment_type`, `headcount_budget`, `status` |
| Relationships    | Department, job grade, employees, approval route resolver                                                                            |
| Indexing         | Unique `(tenant_id, legal_entity_id, position_code)`, `(tenant_id, department_id)`                                                   |
| Audit/compliance | Maintain historical position/title for contracts and payroll snapshots.                                                              |

---

## E. `hr_job_grades`

| Item             | Design                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Defines grade bands, salary bands, leave policy tier, benefits eligibility.                                           |
| Key fields       | `grade_code`, `name`, `level`, `min_salary_minor`, `max_salary_minor`, `currency_code`, `benefit_tier_code`, `status` |
| Relationships    | Positions, contracts, benefits, approval thresholds                                                                   |
| Indexing         | Unique `(tenant_id, legal_entity_id, grade_code)`, `(tenant_id, level)`                                               |
| Audit/compliance | Salary band changes should not retroactively alter old salary decisions.                                              |

---

## F. `hr_payroll_profiles`

| Item             | Design                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Payroll-relevant employee profile, statutory flags, payment method, contribution identifiers.                                                                                                                                                     |
| Key fields       | `employee_id`, `payroll_group_id`, `pay_frequency`, `bank_account_token`, `bank_name`, `tax_residency_country`, `epf_no`, `socso_no`, `eis_eligible`, `pcb_category`, `hrdf_eligible`, `statutory_profile_json`, `effective_from`, `effective_to` |
| Relationships    | Employee, payroll runs, statutory rules, compliance evidence                                                                                                                                                                                      |
| Indexing         | Unique current profile per employee, `(tenant_id, payroll_group_id)`, `(tenant_id, legal_entity_id, effective_from)`                                                                                                                              |
| Audit/compliance | Bank details should be tokenized/encrypted. Statutory profile changes require approval and audit.                                                                                                                                                 |

---

## G. `hr_attendance_events`

| Item             | Design                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Immutable raw attendance event stream: clock-in, clock-out, manual entry, device import.                            |
| Key fields       | `employee_id`, `event_type`, `event_time`, `source`, `device_id`, `geo_json`, `import_batch_id`, `raw_payload_hash` |
| Relationships    | Employee, attendance daily summary, attendance correction request, evidence pack                                    |
| Indexing         | `(tenant_id, employee_id, event_time)`, `(tenant_id, source, import_batch_id)`                                      |
| Audit/compliance | Raw device/import records should be immutable. Corrections create adjustment records, not edits to raw events.      |

---

## H. `hr_attendance_daily`

| Item             | Design                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Derived daily attendance summary for payroll preparation and exception review.                                                                                                    |
| Key fields       | `employee_id`, `work_date`, `scheduled_minutes`, `worked_minutes`, `late_minutes`, `early_out_minutes`, `overtime_minutes`, `absence_code`, `status`, `calculation_snapshot_json` |
| Relationships    | Attendance events, schedules, leave requests, payroll prep                                                                                                                        |
| Indexing         | Unique `(tenant_id, employee_id, work_date)`, `(tenant_id, legal_entity_id, work_date, status)`                                                                                   |
| Audit/compliance | Rebuildable from raw events + approved corrections. Store calculation snapshot for payroll evidence.                                                                              |

---

## I. `hr_leave_entitlements`

| Item             | Design                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Employee leave entitlement and balance per leave type and leave year.                                                                                                                       |
| Key fields       | `employee_id`, `leave_type_code`, `leave_year`, `opening_days`, `accrued_days`, `used_days`, `pending_days`, `adjusted_days`, `carried_forward_days`, `expiry_date`, `policy_evaluation_id` |
| Relationships    | Employee, leave requests, statutory rule version, policy evaluation                                                                                                                         |
| Indexing         | Unique `(tenant_id, employee_id, leave_type_code, leave_year)`                                                                                                                              |
| Audit/compliance | Balance changes should be traceable to policy evaluation, approved leave, manual adjustment, or migration opening balance.                                                                  |

---

## J. `hr_leave_requests`

| Item             | Design                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Employee leave application and approval lifecycle.                                                                                                                                     |
| Key fields       | `employee_id`, `leave_type_code`, `start_date`, `end_date`, `total_days`, `status`, `reason`, `medical_document_id`, `approval_request_id`, `policy_evaluation_id`, `evidence_pack_id` |
| Relationships    | Employee, leave entitlement, approval, documents, attendance daily                                                                                                                     |
| Indexing         | `(tenant_id, employee_id, start_date, end_date)`, `(tenant_id, legal_entity_id, status)`, `(tenant_id, leave_type_code)`                                                               |
| Audit/compliance | Approved leave generates evidence and updates entitlement. Cancellations write reversal events.                                                                                        |

---

## K. `hr_holidays`

| Item             | Design                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose          | Country/state holiday calendar used by leave, attendance, payroll, and scheduling.                                                               |
| Key fields       | `country_code`, `jurisdiction_code`, `holiday_date`, `name`, `holiday_type`, `is_federal`, `source`, `source_version`, `is_working_day_override` |
| Relationships    | Legal entity, work location, leave calculations, attendance calendar                                                                             |
| Indexing         | Unique `(tenant_id, country_code, jurisdiction_code, holiday_date, name)`                                                                        |
| Audit/compliance | Imported from official source. Store source version and import batch. Never silently rewrite past holiday calendars.                             |

---

## L. `hr_claims`

| Item             | Design                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose          | Employee reimbursement and claim approval.                                                                                                                                                       |
| Key fields       | `employee_id`, `claim_no`, `claim_type`, `status`, `claim_date`, `currency_code`, `total_amount_minor`, `approved_amount_minor`, `approval_request_id`, `evidence_pack_id`, `finance_posting_id` |
| Relationships    | Claim lines, documents, approval, finance payable                                                                                                                                                |
| Indexing         | Unique `(tenant_id, legal_entity_id, claim_no)`, `(tenant_id, employee_id, claim_date)`, `(tenant_id, status)`                                                                                   |
| Audit/compliance | Receipt documents require checksum. Finance posting should reference approved claim evidence.                                                                                                    |

---

## M. `hr_claim_lines`

| Item             | Design                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Itemized claim details.                                                                                                                            |
| Key fields       | `claim_id`, `line_no`, `expense_date`, `category_code`, `description`, `amount_minor`, `tax_amount_minor`, `receipt_document_id`, `cost_center_id` |
| Relationships    | Claim, document, finance cost center                                                                                                               |
| Indexing         | `(tenant_id, claim_id, line_no)`, `(tenant_id, category_code)`                                                                                     |
| Audit/compliance | Line-level receipt evidence. Reject edits after approval unless reopened through workflow.                                                         |

---

## N. `hr_benefits`

| Item             | Design                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Benefit plans: medical, insurance, allowance, training, transport, etc.                                                                         |
| Key fields       | `benefit_code`, `name`, `benefit_type`, `country_code`, `eligibility_rule_id`, `provider_vendor_id`, `status`, `effective_from`, `effective_to` |
| Relationships    | Benefit enrollments, vendors, job grades, employees                                                                                             |
| Indexing         | Unique `(tenant_id, legal_entity_id, benefit_code)`, `(tenant_id, country_code, status)`                                                        |
| Audit/compliance | Plan versioning. Eligibility rule changes should not retroactively change approved claims unless recalculated explicitly.                       |

---

## O. `hr_benefit_enrollments`

| Item             | Design                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Employee enrollment in a benefit plan.                                                                                                                  |
| Key fields       | `employee_id`, `benefit_id`, `status`, `effective_from`, `effective_to`, `coverage_level`, `employee_contribution_minor`, `employer_contribution_minor` |
| Relationships    | Employee, benefit, payroll profile                                                                                                                      |
| Indexing         | `(tenant_id, employee_id, status)`, `(tenant_id, benefit_id)`                                                                                           |
| Audit/compliance | Enrollment changes may affect payroll and require evidence.                                                                                             |

---

## P. `hr_documents`

| Item             | Design                                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | HR-specific document metadata linked to document storage.                                                                                                                                     |
| Key fields       | `document_no`, `document_type`, `employee_id`, `object_type`, `object_id`, `storage_object_key`, `sha256_hash`, `mime_type`, `file_size`, `classification`, `retention_policy`, `uploaded_by` |
| Relationships    | Employee, contract, leave request, claim, evidence pack                                                                                                                                       |
| Indexing         | `(tenant_id, employee_id, document_type)`, `(tenant_id, object_type, object_id)`, unique hash where useful                                                                                    |
| Audit/compliance | Store file checksum. Restricted documents require field/object permissions.                                                                                                                   |

---

## Q. `approval_requests`, `approval_steps`, `approval_actions`

| Item             | Design                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Generic approval workflow used by HRM and other ERP modules.                                                                                                                                                                 |
| Key fields       | Request: `module_code`, `object_type`, `object_id`, `status`, `route_code`, `route_version`, `snapshot`; Step: `step_no`, `approver_type`, `approver_id`, `status`; Action: `action_type`, `acted_by`, `acted_at`, `comment` |
| Relationships    | HR objects, users, employees, evidence pack, audit events                                                                                                                                                                    |
| Indexing         | Inbox index `(tenant_id, status, current_step_no)`, object index `(tenant_id, object_type, object_id)`                                                                                                                       |
| Audit/compliance | Approval snapshot must preserve what approvers saw. Later record edits must not mutate old approval evidence.                                                                                                                |

---

## R. `hr_audit_events`

| Item             | Design                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose          | Immutable HR audit ledger for every HR state change.                                                                                                                                                                                 |
| Key fields       | `actor_user_id`, `event_type`, `subject_type`, `subject_id`, `action`, `before_json`, `after_json`, `metadata_json`, `approval_request_id`, `evidence_pack_id`, `policy_evaluation_id`, `previous_hash`, `event_hash`, `occurred_at` |
| Relationships    | Employee, approval, evidence, policy evaluation                                                                                                                                                                                      |
| Indexing         | `(tenant_id, subject_type, subject_id)`, `(tenant_id, actor_user_id)`, `(tenant_id, occurred_at)`, unique event hash                                                                                                                 |
| Audit/compliance | Append-only. No update/delete except controlled retention/anonymization procedures where legally required.                                                                                                                           |

---

## S. `compliance_evidence`

| Item             | Design                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose          | Evidence for statutory calculations, reports, submissions, and payroll preparation.                                                                                                                                |
| Key fields       | `country_code`, `jurisdiction_code`, `evidence_type`, `period_start`, `period_end`, `employee_id`, `payroll_run_id`, `rule_version_id`, `input_hash`, `output_hash`, `document_id`, `external_reference`, `status` |
| Relationships    | Employee, payroll run, statutory rules, documents, audit events                                                                                                                                                    |
| Indexing         | `(tenant_id, legal_entity_id, country_code, period_start, period_end)`, `(tenant_id, evidence_type, status)`                                                                                                       |
| Audit/compliance | Stores calculation inputs/outputs hash. Generated statutory reports should be reproducible from stored snapshots.                                                                                                  |

---

## T. `country_statutory_rules`

| Item             | Design                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Versioned country/state statutory rules for payroll, leave, holidays, contribution, tax, levy.                                                                            |
| Key fields       | `country_code`, `jurisdiction_code`, `rule_type`, `rule_code`, `version`, `effective_from`, `effective_to`, `rule_body_json`, `source_name`, `source_reference`, `status` |
| Relationships    | Policy evaluations, leave entitlements, payroll statutory calculations, compliance evidence                                                                               |
| Indexing         | Unique `(country_code, jurisdiction_code, rule_type, rule_code, version)`, `(country_code, rule_type, effective_from)`                                                    |
| Audit/compliance | Never overwrite published rules. Add new version. Store source reference and approval before activation.                                                                  |

---

## U. `statutory_rate_rows`

| Item             | Design                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose          | Rate/band rows used by statutory calculators, especially EPF/SOCSO/EIS-style schedules.                                                                                                 |
| Key fields       | `rule_id`, `category_code`, `band_min_minor`, `band_max_minor`, `employee_rate_pct`, `employer_rate_pct`, `employee_fixed_minor`, `employer_fixed_minor`, `rounding_mode`, `sort_order` |
| Relationships    | Country statutory rule, payroll calculation result                                                                                                                                      |
| Indexing         | `(tenant_id, rule_id, category_code, band_min_minor)`                                                                                                                                   |
| Audit/compliance | Rate rows are versioned through parent rule. Payroll evidence stores selected row id/version.                                                                                           |

---

# 4. Malaysia-first compliance model

Malaysia should be the first production statutory pack, but the schema should treat Malaysia as **one country rule package**, not as hardcoded application behavior.

## 4.1 Malaysia statutory anchors

### EPF / KWSP

Afenda should store EPF as a statutory contribution rule with wage-band/rate rows and employee category logic. KWSP currently shows common contribution categories such as Malaysian/PR employees below 60 with employee share 11% and employer share 13% for wages RM5,000 and below, and employer share 12% for more than RM5,000. KWSP also states employers should refer to the Third Schedule and not simply calculate exact percentages except for certain high-wage cases; total contributions including cents are rounded up to the next ringgit. ([KWSP][7])

Architecture implication:

```txt
Do not implement EPF as salary * percentage only.
Implement EPF as:
employee category
+ age band
+ wage band schedule
+ contribution month
+ rounding rule
+ rule version
```

---

### SOCSO / PERKESO

SOCSO should be modeled through Act/category-based contribution schedules, with wage ceiling and eligibility rules. PERKESO states the contribution ceiling increased from RM5,000 to RM6,000 effective 1 October 2024, and employees above RM6,000 are subject to the RM6,000 wage ceiling. ([PERKESO][8])

Architecture implication:

```txt
SOCSO calculator input:
employee age
citizenship / foreign worker category
first contribution age
assumed monthly wage
contribution month
Act/category
```

---

### EIS

PERKESO states EIS contribution is 0.4% of assumed monthly salary, split 0.2% employer and 0.2% employee, with contribution rates set out in the applicable schedule and employer monthly payment responsibility. ([PERKESO][9])

Architecture implication:

```txt
EIS should be its own statutory rule.
Do not merge SOCSO and EIS into one deduction field.
They share PERKESO context but have different evidence outputs.
```

---

### PCB / MTD income tax

HASiL describes MTD/PCB as monthly salary deduction for employee income tax, determined either through the computerized payroll calculation method or e-Jadual PCB via e-CP39. ([Hasil][10]) HASiL’s employer responsibility page also states employers should make MTD based on the schedule or computerized method and remit to IRBM on or before the 15th of the following month, submit Form E with C.P.8D by 31 March, provide EA/EC statements by the last day of February, and retain records for 7 years. ([Hasil][11]) HASiL also publishes MTD 2026 payroll data specifications, TP1, TP3, and testing materials for computerized calculations. ([Hasil][12])

Architecture implication:

```txt
PCB/MTD requires:
employee tax profile
monthly remuneration snapshot
relief/rebate declaration evidence
previous employment TP3 evidence
calculation version
submission evidence
record retention evidence
```

---

### HRDF / HRD levy readiness

HRD Corp states employers with 10 or more Malaysian employees are compulsory to register, with a monthly levy of 1% of monthly wages, while employers with 5 to 9 Malaysian employees may register optionally at 0.5%. ([HRD Corp][13]) HRD Corp’s FAQ also describes the levy as imposed under the PSMB Act 2001 on liable employers. ([HRD Corp][14])

Architecture implication:

```txt
HRDF should be legal-entity-level, not employee-only.
Inputs:
legal entity industry/coverage
number of Malaysian employees
monthly wage base
registration status
effective period
```

---

### Public holidays by state

Malaysia public holidays must be state-aware. The official 2026 holiday schedule separates federal and state holidays and marks applicability by state/federal territory.

Architecture implication:

```txt
Holiday calculation input:
country_code = MY
jurisdiction_code = MY-SGR / MY-JHR / MY-KUL / etc.
work location state
holiday source version
date
```

---

### Employment Act leave and coverage

JTKSM’s FAQ for the Employment Act amendments states the amendments effective 1 January 2023 apply to Peninsular Malaysia and Federal Territory of Labuan, while Sabah and Sarawak continue under their respective Labour Ordinances until amended; it also states private-sector employees receive protections under the amended Act regardless of wage limit, while certain wage-above-RM4,000 claims are excluded for overtime/rest day/public holiday/termination benefits except manual employees.

The Employment Act text provides annual leave tiers of 8, 12, and 16 days depending on length of service, with proration rules for incomplete service. ([JTK Semenanjung Malaysia][15]) It also provides sick leave tiers of 14, 18, and 22 days where hospitalization is not necessary, and 60 days where hospitalization is necessary. ([JTK Semenanjung Malaysia][15]) The same section includes 7 consecutive days of paid paternity leave subject to conditions. ([JTK Semenanjung Malaysia][15])

Architecture implication:

```txt
Do not store "Malaysia annual leave = 8/12/16" as app constants.
Store:
country = MY
region scope = Peninsular/Labuan or Sabah/Sarawak
leave type
service-length bands
effective date
source reference
calculation function version
```

---

## 4.2 Malaysia rule package structure

Create a Malaysia adapter, but keep it intentionally small:

```txt
modules/hrm/payroll/malaysia/
  malaysia-statutory-profile.ts
  malaysia-epf.engine.ts
  malaysia-socso.engine.ts
  malaysia-eis.engine.ts
  malaysia-pcb.boundary.ts
  malaysia-hrdf.engine.ts
  malaysia-leave.engine.ts
  malaysia-holiday-importer.ts
```

Do **not** build a giant generic formula scripting language in Phase 1.

Use this instead:

```ts
export interface StatutoryRuleEngine<TInput, TOutput> {
  countryCode: string
  ruleType: string
  evaluate(input: TInput, ruleVersion: StatutoryRuleVersion): TOutput
}
```

Then register Malaysia engines:

```ts
ruleRegistry.register("MY", "EPF", malaysiaEpfEngine)
ruleRegistry.register("MY", "SOCSO", malaysiaSocsoEngine)
ruleRegistry.register("MY", "EIS", malaysiaEisEngine)
ruleRegistry.register("MY", "PCB", malaysiaPcbBoundary)
ruleRegistry.register("MY", "HRDF", malaysiaHrdfEngine)
ruleRegistry.register("MY", "LEAVE_ENTITLEMENT", malaysiaLeaveEngine)
```

This is expandable without pretending all Southeast Asian statutory systems are the same.

---

## 4.3 Avoid hardcoding Malaysia rules

Use these design rules:

| Problem         | Bad approach                        | Afenda approach                                                                            |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| EPF rates       | `if country === "MY" salary * 0.11` | Versioned EPF rule + wage bands + category                                                 |
| Public holidays | Hardcoded dates in app              | Import official calendar into `hr_holidays`                                                |
| Leave rules     | Constants in leave service          | `country_statutory_rules` + Malaysia leave engine                                          |
| PCB             | App-level formula only              | Versioned boundary with official spec version and test cases                               |
| HRDF            | One global boolean                  | Legal-entity rule with employee count, industry coverage, rate version                     |
| SEA expansion   | Massive generic DSL now             | Start with typed MY adapter; extract abstractions only when SG/ID/TH/VN/PH reuse is proven |

---

# 5. Backend architecture

## 5.1 Domain services

Create services around business capabilities, not database tables.

| Service                       | Responsibilities                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `EmployeeService`             | Create employee, update master data, archive, timeline                             |
| `EmploymentContractService`   | Hire, renew contract, salary change, transfer, probation confirmation, termination |
| `OrgStructureService`         | Departments, positions, grades                                                     |
| `LeaveService`                | Apply, approve, reject, cancel leave                                               |
| `LeaveEntitlementEngine`      | Calculate entitlement, accrual, carry-forward, encumbrance                         |
| `AttendanceService`           | Clock event, daily summary, correction request                                     |
| `AttendanceCalculationEngine` | Normalize events, calculate lateness/overtime/absence                              |
| `PayrollProfileService`       | Statutory profile, payroll group, bank token, tax profile                          |
| `PayrollPreparationService`   | Monthly payroll readiness, exceptions, statutory calculation snapshots             |
| `ClaimsService`               | Claim submission, approval, finance handoff                                        |
| `BenefitsService`             | Plans, enrollments, eligibility                                                    |
| `HRDocumentService`           | HR document links, document classification, retention                              |
| `ComplianceEvidenceService`   | Statutory evidence packs and calculation hashes                                    |
| `HRApprovalService`           | Create HR approval requests using generic approval engine                          |
| `HRAuditWriter`               | Writes HR audit events inside transaction                                          |
| `PolicyEvaluationService`     | Evaluates and records policy decision traces                                       |

---

## 5.2 Validation layers

Use layered validation:

```txt
Client form validation
→ Server Action/tRPC input validation
→ Permission check
→ Domain invariant validation
→ Policy evaluation
→ Approval route validation
→ DB constraints
→ Audit/evidence write
```

Example for leave:

```txt
Input validation:
  date range valid
  leave type exists
  employee exists

Permission:
  employee can apply for self
  HR can apply on behalf

Domain invariant:
  employee active
  dates not locked payroll period
  no overlapping approved leave

Policy:
  entitlement available
  medical cert required for sick leave if policy says so
  public holidays excluded/included according to rule

Approval:
  manager route resolved
  approver not same as applicant unless policy allows

DB:
  transaction writes request + approval + evidence + audit
```

---

## 5.3 Payroll calculation boundary

HRM should first build **payroll preparation**, then expand to full payroll.

Boundary:

| HRM owns                            | Finance/accounting owns   |
| ----------------------------------- | ------------------------- |
| Employee payroll profile            | GL account ownership      |
| Attendance/leave payroll inputs     | Actual payment execution  |
| Statutory contribution calculations | Bank reconciliation       |
| Payroll approval evidence           | Final financial close     |
| Payroll run snapshot                | Posted journal entries    |
| Payslip evidence later              | Treasury/payment controls |

Payroll states:

```txt
draft
→ collecting_inputs
→ calculated
→ exception_review
→ pending_approval
→ approved
→ posted_to_finance
→ locked
```

Each payroll run should snapshot:

```txt
employee profile at period
contract at period
salary at period
attendance summary
leave unpaid impact
claims/benefits deductions if applicable
statutory rule versions
calculation outputs
approval evidence
```

Never calculate payroll from live employee data after the run is locked.

---

## 5.4 Attendance calculation boundary

Attendance should separate raw events from calculated summaries.

```txt
Raw clock events
→ normalization
→ daily summary
→ exception detection
→ correction workflow
→ approved adjustment
→ recalculated daily summary
→ payroll input snapshot
```

Rules:

```txt
Raw attendance event is immutable.
Correction creates an adjustment.
Daily summary is derived but snapshotted for payroll.
Payroll-locked attendance cannot be changed without reversal workflow.
```

---

## 5.5 Leave entitlement engine

The leave engine should support:

```txt
opening balance
annual entitlement
monthly accrual
carry-forward
expiry
manual adjustment
pending encumbrance
approved usage
cancellation reversal
```

Use this balance formula:

```txt
available =
  opening_days
+ accrued_days
+ carried_forward_days
+ adjusted_days
- used_days
- pending_days
```

When leave is submitted:

```txt
pending_days increases
```

When approved:

```txt
pending_days decreases
used_days increases
```

When rejected:

```txt
pending_days decreases
```

When cancelled after approval:

```txt
used_days decreases or reversal adjustment is written
```

---

## 5.6 Approval workflow engine

Approval should be generic, but route resolution can be HR-specific.

Example route rules:

```txt
Leave:
  employee → reporting manager → HR if special leave

Attendance correction:
  employee → manager → HR if payroll period affected

Salary change:
  HR → manager/director → payroll approver → finance controller

Termination:
  HR → department head → payroll → finance → final HR confirmation

Payroll run:
  payroll preparer → payroll approver → finance controller
```

Store approval snapshots:

```json
{
  "objectType": "leave_request",
  "employeeNo": "MY-00042",
  "employeeName": "Aminah Binti Rahman",
  "leaveType": "annual",
  "startDate": "2026-06-10",
  "endDate": "2026-06-12",
  "totalDays": 3,
  "balanceBefore": 10,
  "balanceAfter": 7,
  "policyVersion": "MY_LEAVE_2026_v1"
}
```

Approvers should approve the snapshot they saw, not a mutable live record.

---

## 5.7 Document/evidence service

Evidence model:

```txt
Evidence Pack
 ├── Evidence Item: uploaded document
 ├── Evidence Item: generated calculation snapshot
 ├── Evidence Item: approval decision
 ├── Evidence Item: statutory source/rule version
 └── Evidence Item: external submission reference
```

Document fields:

```txt
storage_object_key
sha256_hash
mime_type
file_size
document_type
classification
retention_policy
uploaded_by
uploaded_at
```

Evidence fields:

```txt
input_hash
output_hash
rule_version_id
approval_request_id
document_id
external_reference
generated_at
```

---

## 5.8 Audit writing pattern

Every mutating service should follow this pattern:

```ts
await db.transaction(async (tx) => {
  const before = await repository.getForUpdate(tx, id)

  const decision = await policyService.evaluate(tx, ctx, {
    policy: "hrm.leave.apply",
    input,
  })

  const approval = await approvalService.createIfRequired(tx, ctx, {
    objectType: "leave_request",
    snapshot,
  })

  const evidencePack = await evidenceService.createPack(tx, ctx, {
    subjectType: "leave_request",
    items,
  })

  const after = await repository.update(tx, {
    ...input,
    approvalRequestId: approval.id,
    policyEvaluationId: decision.id,
    evidencePackId: evidencePack.id,
  })

  await auditWriter.write(tx, ctx, {
    eventType: "hrm.leave.requested",
    subjectType: "leave_request",
    subjectId: after.id,
    before,
    after,
    approvalRequestId: approval.id,
    evidencePackId: evidencePack.id,
    policyEvaluationId: decision.id,
  })

  await outbox.write(tx, {
    type: "hrm.leave.requested",
    payload: { leaveRequestId: after.id },
  })
})
```

---

## 5.9 Revalidation and caching strategy

HRM is sensitive and highly stateful, so caching should be conservative.

| Data             | Strategy                                                        |
| ---------------- | --------------------------------------------------------------- |
| Employee profile | Server-rendered, revalidate after mutations                     |
| Employee list    | Short-lived or no cache; filter through server                  |
| Public holidays  | Cache by country/year/state; revalidate after import            |
| Policy rules     | Cache active rule version; invalidate on activation             |
| Approval inbox   | No long cache; real-time-ish refresh                            |
| Payroll prep     | No stale cache after calculation or approval                    |
| Audit timeline   | Append-only; can paginate and cache by subject after event hash |

Use `revalidatePath` for route-specific invalidation after mutations, and later add tag-based invalidation for shared read models.

---

## 5.10 Error handling

Use typed domain errors:

```ts
class HRDomainError extends Error {
  constructor(
    public code:
      | "EMPLOYEE_NOT_ACTIVE"
      | "LEAVE_BALANCE_INSUFFICIENT"
      | "PAYROLL_PERIOD_LOCKED"
      | "APPROVAL_REQUIRED"
      | "PERMISSION_DENIED"
      | "POLICY_VERSION_INACTIVE",
    public details?: Record<string, unknown>
  ) {
    super(code)
  }
}
```

Map errors to ERP-friendly UI:

| Error                        | UI response                                   |
| ---------------------------- | --------------------------------------------- |
| `LEAVE_BALANCE_INSUFFICIENT` | Show entitlement drawer with balance math     |
| `PAYROLL_PERIOD_LOCKED`      | Show locked period and reversal workflow      |
| `PERMISSION_DENIED`          | Show permission name and required role        |
| `POLICY_VERSION_INACTIVE`    | Show rule version mismatch                    |
| `APPROVAL_REQUIRED`          | Submit as pending approval instead of failing |

---

## 5.11 Testing strategy

| Test type                 | Coverage                                                              |
| ------------------------- | --------------------------------------------------------------------- |
| Unit tests                | Leave entitlement, attendance calculation, Malaysia statutory engines |
| Golden tests              | EPF/SOCSO/EIS/PCB sample calculations by rule version                 |
| Service integration tests | Hire, confirm, leave approval, correction, payroll prep               |
| DB tests                  | Constraints, RLS, tenant isolation, effective-date overlaps           |
| Approval tests            | Route resolution, delegation, rejection, cancellation                 |
| Audit tests               | Every mutation writes audit event and hash                            |
| Evidence tests            | Evidence pack created with checksum and source references             |
| E2E tests                 | Full employee lifecycle through UI                                    |
| Migration tests           | Forward migration and rollback safety                                 |
| Security tests            | Salary field visibility, cross-tenant access denial                   |

---

# 6. Frontend architecture for dense ERP workflows

## Design principles

Afenda HRM should use **ERP workspaces**, not generic SaaS cards.

Core UI patterns:

```txt
Dense tables
Split panes
Command bars
Saved filters
Bulk actions
Inline status chips
Effective-dated timelines
Audit side panels
Evidence drawers
Approval context panels
Period locks
Exportable views
```

---

## 6.1 HR dashboard

| Area                      | Design                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Primary user intent       | See workforce operational exceptions and pending decisions.                                                |
| Layout                    | Top command bar, KPI strip, exception queues, upcoming events, compliance alerts.                          |
| Data tables               | Probation ending, pending approvals, missing documents, attendance exceptions, payroll readiness blockers. |
| Filters                   | Legal entity, country, department, month, status.                                                          |
| Bulk actions              | Send reminders, assign HR owner, export exception list.                                                    |
| Dialogs/drawers           | Exception detail drawer, approval drawer, evidence drawer.                                                 |
| Empty states              | “No payroll blockers for this period” / “No probation confirmations due.”                                  |
| Audit/evidence visibility | Every exception links to source record and audit timeline.                                                 |

---

## 6.2 Employee master record

| Area                      | Design                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Primary user intent       | Search, inspect, and maintain canonical employee records.                                                                     |
| Layout                    | Full-width table with pinned columns: employee no, name, status, department, position, manager, hire date, payroll readiness. |
| Data tables               | Employee list with current contract summary and document status.                                                              |
| Filters                   | Status, department, position, legal entity, country, manager, payroll group, missing documents.                               |
| Bulk actions              | Assign department, assign manager, export, request document, archive draft employees.                                         |
| Dialogs/drawers           | New employee drawer, edit master data drawer, transfer drawer, salary change drawer.                                          |
| Empty states              | “No employees yet. Create employee or import workforce file.”                                                                 |
| Audit/evidence visibility | Row action opens profile timeline and evidence summary.                                                                       |

---

## 6.3 Employee profile timeline

| Area                      | Design                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Primary user intent       | Understand everything that happened to one employee.                                                                 |
| Layout                    | Header with employee identity and status; left navigation; center effective-dated facts; right audit/evidence panel. |
| Data tables               | Contracts, leave history, attendance exceptions, claims, documents, approvals.                                       |
| Filters                   | Timeline event type, period, approval status, evidence type.                                                         |
| Bulk actions              | Request document, generate letter, export employee file.                                                             |
| Dialogs/drawers           | Contract detail, approval decision, evidence pack, document preview.                                                 |
| Empty states              | “No leave history” / “No documents uploaded.”                                                                        |
| Audit/evidence visibility | Timeline is powered by audit events, with every state change linked to evidence.                                     |

---

## 6.4 Leave management

| Area                      | Design                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Primary user intent       | Apply, approve, monitor, and reconcile leave.                                          |
| Layout                    | Split view: left leave request table, right selected request detail and balance math.  |
| Data tables               | Leave requests, entitlement balances, team calendar.                                   |
| Filters                   | Employee, department, leave type, status, date range, approver, insufficient evidence. |
| Bulk actions              | Approve, reject, cancel, export leave report, recalculate entitlement.                 |
| Dialogs/drawers           | Apply leave, approval drawer, entitlement adjustment drawer, medical cert upload.      |
| Empty states              | “No pending leave requests.”                                                           |
| Audit/evidence visibility | Shows balance before/after, policy version, approval path, documents.                  |

---

## 6.5 Attendance console

| Area                      | Design                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Primary user intent       | Resolve attendance exceptions before payroll.                                                     |
| Layout                    | Exception-first table with daily summaries; right drawer shows raw events and correction history. |
| Data tables               | Daily attendance summary, raw events, correction requests.                                        |
| Filters                   | Date, department, employee, late, absent, missing clock-out, pending correction, payroll locked.  |
| Bulk actions              | Mark reviewed, request correction, approve corrections, export timesheet.                         |
| Dialogs/drawers           | Correction drawer, raw event drawer, device import batch drawer.                                  |
| Empty states              | “No attendance exceptions for selected period.”                                                   |
| Audit/evidence visibility | Raw event hashes, correction approval, recalculation snapshot.                                    |

---

## 6.6 Payroll preparation console

| Area                      | Design                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Primary user intent       | Prepare monthly payroll inputs and statutory evidence.                                                   |
| Layout                    | Period selector, readiness checklist, employee payroll grid, exception panel, statutory preview.         |
| Data tables               | Payroll employees, missing profiles, unpaid leave, attendance exceptions, statutory calculation preview. |
| Filters                   | Payroll group, legal entity, department, readiness status, statutory error, approval status.             |
| Bulk actions              | Calculate preview, lock inputs, send approval, export payroll evidence, post to finance.                 |
| Dialogs/drawers           | Employee payroll snapshot, statutory calculation trace, exception resolver.                              |
| Empty states              | “No employees in payroll group” / “All employees ready for calculation.”                                 |
| Audit/evidence visibility | Shows snapshot version, rule version, input hash, output hash, approval chain.                           |

---

## 6.7 Approval inbox

| Area                      | Design                                                               |
| ------------------------- | -------------------------------------------------------------------- |
| Primary user intent       | Approve ERP decisions with full context.                             |
| Layout                    | Inbox table on left, decision detail on right, audit/evidence below. |
| Data tables               | Pending approvals, delegated approvals, completed approvals.         |
| Filters                   | Module, object type, requester, due date, legal entity, risk level.  |
| Bulk actions              | Approve low-risk items, reject, delegate, request more info.         |
| Dialogs/drawers           | Approval decision drawer, evidence drawer, policy trace drawer.      |
| Empty states              | “No approvals pending.”                                              |
| Audit/evidence visibility | Shows approval snapshot, not mutable live data only.                 |

---

## 6.8 Compliance evidence center

| Area                      | Design                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Primary user intent       | Prove statutory payroll and HR decisions.                                                      |
| Layout                    | Compliance period selector, evidence register, statutory category tabs.                        |
| Data tables               | EPF evidence, SOCSO evidence, EIS evidence, PCB evidence, HRDF readiness, leave rule evidence. |
| Filters                   | Country, legal entity, period, evidence type, status, rule version, external reference.        |
| Bulk actions              | Generate evidence pack, export, mark submitted, attach external receipt.                       |
| Dialogs/drawers           | Evidence pack detail, calculation trace, source rule version.                                  |
| Empty states              | “No evidence generated for this period.”                                                       |
| Audit/evidence visibility | Primary screen purpose is evidence visibility.                                                 |

---

## 6.9 HR documents vault

| Area                      | Design                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| Primary user intent       | Find and manage employee documents securely.                            |
| Layout                    | Document register with employee/object links and preview drawer.        |
| Data tables               | Documents, document requests, expiring documents.                       |
| Filters                   | Employee, document type, classification, expiry, missing required docs. |
| Bulk actions              | Request documents, upload batch, classify, export allowed documents.    |
| Dialogs/drawers           | Upload, preview, link to object, retention policy.                      |
| Empty states              | “No documents match this filter.”                                       |
| Audit/evidence visibility | Shows upload actor, checksum, linked evidence packs.                    |

---

## 6.10 Policy/rule configuration screens

| Area                      | Design                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| Primary user intent       | Configure HR policies and statutory rule versions safely.                  |
| Layout                    | Rule list, version history, effective-date editor, test-case panel.        |
| Data tables               | Leave policies, approval routes, statutory rule versions, holiday imports. |
| Filters                   | Country, legal entity, rule type, active/draft/retired, effective date.    |
| Bulk actions              | Import holidays, clone rule version, activate version, retire version.     |
| Dialogs/drawers           | Rule version editor, test calculation drawer, activation approval drawer.  |
| Empty states              | “No active rule for selected country.”                                     |
| Audit/evidence visibility | Activation requires approval and records source reference.                 |

---

# 7. End-to-end workflows

## 7.1 Hire employee

| Step               | Design                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Actor              | HR Officer                                                                                                               |
| Trigger            | New hire approved outside or inside Afenda                                                                               |
| Data touched       | `hr_employees`, `hr_employment_contracts`, `hr_payroll_profiles`, `hr_documents`, `approval_requests`, `hr_audit_events` |
| Approval path      | HR Officer → HR Admin or Department Head if required                                                                     |
| Audit event        | `hrm.employee.hired`                                                                                                     |
| Evidence generated | Hiring evidence pack: contract draft/signed contract, offer approval, payroll profile checklist                          |
| Failure states     | Duplicate employee number, missing legal entity, missing contract, payroll profile incomplete, approval route unresolved |

---

## 7.2 Confirm employee after probation

| Step               | Design                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Actor              | Manager or HR                                                                                               |
| Trigger            | Probation end date approaching                                                                              |
| Data touched       | `hr_employees`, `hr_employment_contracts`, `approval_requests`, `hr_documents`, `hr_audit_events`           |
| Approval path      | Manager → HR                                                                                                |
| Audit event        | `hrm.employee.confirmed`                                                                                    |
| Evidence generated | Confirmation letter, approval snapshot, probation review notes                                              |
| Failure states     | Employee not on probation, probation date mismatch, missing manager approval, existing pending confirmation |

---

## 7.3 Apply and approve leave

| Step               | Design                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Actor              | Employee applies; manager approves                                                                                          |
| Trigger            | Employee submits leave request                                                                                              |
| Data touched       | `hr_leave_requests`, `hr_leave_entitlements`, `approval_requests`, `hr_documents`, `hr_audit_events`, `hr_attendance_daily` |
| Approval path      | Employee → Manager → HR for special leave                                                                                   |
| Audit event        | `hrm.leave.requested`, `hrm.leave.approved`                                                                                 |
| Evidence generated | Leave balance before/after, policy version, medical certificate if applicable                                               |
| Failure states     | Insufficient balance, overlapping leave, payroll period locked, medical cert missing, approver unavailable                  |

---

## 7.4 Clock-in / attendance correction

| Step               | Design                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Actor              | Employee, manager, HR                                                                                        |
| Trigger            | Clock event recorded or exception detected                                                                   |
| Data touched       | `hr_attendance_events`, `hr_attendance_daily`, `approval_requests`, `hr_audit_events`, `compliance_evidence` |
| Approval path      | Employee correction → Manager → HR if payroll period affected                                                |
| Audit event        | `hrm.attendance.clocked`, `hrm.attendance.corrected`                                                         |
| Evidence generated | Raw event hash, correction reason, approval snapshot, recalculated daily summary                             |
| Failure states     | Duplicate event, invalid correction, payroll locked, missing reason, device import mismatch                  |

---

## 7.5 Prepare monthly payroll

| Step               | Design                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Actor              | Payroll Preparer                                                                                                                        |
| Trigger            | Payroll period opened                                                                                                                   |
| Data touched       | `hr_payroll_profiles`, `hr_employment_contracts`, `hr_attendance_daily`, `hr_leave_requests`, `compliance_evidence`, payroll run tables |
| Approval path      | Payroll Preparer → Payroll Approver → Finance Controller                                                                                |
| Audit event        | `hrm.payroll.prepared`, `hrm.payroll.approved`, `hrm.payroll.locked`                                                                    |
| Evidence generated | Payroll input snapshot, statutory rule versions, exception checklist                                                                    |
| Failure states     | Missing payroll profile, unresolved attendance exception, unlocked leave changes, missing bank token, statutory calculation error       |

---

## 7.6 Generate statutory contribution evidence

| Step               | Design                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Actor              | Payroll Preparer or Compliance Officer                                                                        |
| Trigger            | Payroll calculated or statutory evidence requested                                                            |
| Data touched       | `compliance_evidence`, `country_statutory_rules`, `statutory_rate_rows`, payroll snapshots, `hr_audit_events` |
| Approval path      | Payroll Approver or Compliance Officer                                                                        |
| Audit event        | `hrm.compliance.evidence.generated`                                                                           |
| Evidence generated | EPF/SOCSO/EIS/PCB/HRDF calculation traces, input/output hashes, source rule version                           |
| Failure states     | Missing statutory profile, inactive rule version, unsupported employee category, mismatched period            |

---

## 7.7 Submit claim

| Step               | Design                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Actor              | Employee                                                                                                     |
| Trigger            | Employee submits reimbursement claim                                                                         |
| Data touched       | `hr_claims`, `hr_claim_lines`, `hr_documents`, `approval_requests`, finance handoff event, `hr_audit_events` |
| Approval path      | Employee → Manager → Finance if over threshold                                                               |
| Audit event        | `hrm.claim.submitted`, `hrm.claim.approved`, `hrm.claim.sent_to_finance`                                     |
| Evidence generated | Receipts, claim policy evaluation, approval snapshot                                                         |
| Failure states     | Missing receipt, amount over policy, duplicate receipt hash, invalid cost center                             |

---

## 7.8 Change salary

| Step               | Design                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Actor              | HR Admin                                                                                                                          |
| Trigger            | Promotion, increment, correction                                                                                                  |
| Data touched       | `hr_employment_contracts`, possibly compensation revision table, `approval_requests`, payroll profile snapshot, `hr_audit_events` |
| Approval path      | HR → Department Head → Payroll Approver → Finance Controller                                                                      |
| Audit event        | `hrm.compensation.changed`                                                                                                        |
| Evidence generated | Salary change letter, approval snapshot, effective-date record, policy evaluation                                                 |
| Failure states     | Effective date overlaps locked payroll, salary outside grade band, missing approver, duplicate active contract revision           |

---

## 7.9 Resignation / termination

| Step               | Design                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Actor              | Employee resigns or HR initiates termination                                                                                             |
| Trigger            | Resignation letter or termination decision                                                                                               |
| Data touched       | `hr_employees`, `hr_employment_contracts`, `hr_documents`, `hr_leave_entitlements`, payroll prep, `approval_requests`, `hr_audit_events` |
| Approval path      | HR → Department Head → Payroll → Finance                                                                                                 |
| Audit event        | `hrm.employee.resignation_recorded`, `hrm.employee.terminated`                                                                           |
| Evidence generated | Resignation letter, termination letter, final payroll checklist, leave encashment calculation                                            |
| Failure states     | Missing document, final payroll not ready, unreturned assets, unresolved claims, statutory notice requirement not satisfied              |

---

## 7.10 Employee document update

| Step               | Design                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Actor              | Employee or HR                                                                             |
| Trigger            | Employee uploads document or HR requests update                                            |
| Data touched       | `hr_documents`, `compliance_evidence`, linked HR object, `hr_audit_events`                 |
| Approval path      | Optional HR verification                                                                   |
| Audit event        | `hrm.document.uploaded`, `hrm.document.verified`                                           |
| Evidence generated | Document checksum, uploader, verification status                                           |
| Failure states     | Unsupported file type, duplicate document, missing classification, insufficient permission |

---

# 8. Engineering delivery plan

## Phase 0 — Domain model and governance contracts

| Area                | Plan                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Files/modules       | `server/auth`, `server/audit`, `server/evidence`, `server/policy`, `server/workflow`, `modules/hrm/audit`, `modules/hrm/compliance` |
| DB migrations       | Core HRM enums, tenant columns, audit events, evidence packs, approval tables, statutory rule tables                                |
| Tests               | RLS test, audit write test, evidence checksum test, approval route smoke test                                                       |
| Acceptance criteria | A dummy HRM mutation writes canonical row + audit + evidence + outbox event in one transaction                                      |
| Risks               | Building too much generic infrastructure before HRM needs it                                                                        |
| Guardrails          | Only implement primitives required by employee creation and leave approval                                                          |

---

## Phase 1 — Employee master data

| Area                | Plan                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Files/modules       | `modules/hrm/employees`, `modules/hrm/employment`, `modules/hrm/org`, employee pages                                                |
| DB migrations       | `hr_employees`, `hr_employment_contracts`, `hr_departments`, `hr_positions`, `hr_job_grades`, `hr_payroll_profiles`, `hr_documents` |
| Tests               | Create employee, update employee, contract effective date, duplicate employee number, salary permission                             |
| Acceptance criteria | HR can create employee, attach contract, view timeline, and every mutation appears in audit                                         |
| Risks               | Over-modeling every HR edge case before first employee record works                                                                 |
| Guardrails          | Support one active contract per employee first; add complex secondment later                                                        |

---

## Phase 2 — Leave and attendance

| Area                | Plan                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Files/modules       | `modules/hrm/leave`, `modules/hrm/attendance`, `modules/hrm/payroll/malaysia/malaysia-leave.engine.ts`          |
| DB migrations       | `hr_leave_entitlements`, `hr_leave_requests`, `hr_holidays`, `hr_attendance_events`, `hr_attendance_daily`      |
| Tests               | Malaysia annual leave tiers, sick leave rules, public holiday exclusion, overlapping leave, correction workflow |
| Acceptance criteria | Employee applies leave, manager approves, balance updates, attendance correction creates evidence               |
| Risks               | Trying to build advanced rostering too early                                                                    |
| Guardrails          | Manual attendance + correction workflow first; biometric integration later                                      |

---

## Phase 3 — Payroll preparation and statutory evidence

| Area                | Plan                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Files/modules       | `modules/hrm/payroll`, `modules/hrm/compliance`, Malaysia statutory engines                             |
| DB migrations       | Payroll run snapshot tables, `compliance_evidence`, statutory result tables                             |
| Tests               | EPF/SOCSO/EIS golden samples, payroll readiness blockers, locked payroll period, evidence hash          |
| Acceptance criteria | Payroll preparer can open period, resolve blockers, calculate statutory preview, generate evidence pack |
| Risks               | Premature full payroll disbursement and bank file complexity                                            |
| Guardrails          | Build payroll preparation first; finance posting and bank files only after evidence workflow is stable  |

---

## Phase 4 — Claims, benefits, documents

| Area                | Plan                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Files/modules       | `modules/hrm/claims`, `modules/hrm/benefits`, `modules/hrm/documents`                                 |
| DB migrations       | `hr_claims`, `hr_claim_lines`, `hr_benefits`, `hr_benefit_enrollments`, document retention fields     |
| Tests               | Claim approval, receipt checksum, benefit eligibility, finance handoff                                |
| Acceptance criteria | Employee submits claim with receipt, approval creates finance handoff event, benefits can be assigned |
| Risks               | Complex insurance/provider integrations too early                                                     |
| Guardrails          | Store provider/vendor reference only; integration comes after internal evidence flow works            |

---

## Phase 5 — SEA country expansion

| Area                | Plan                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files/modules       | `modules/hrm/payroll/singapore`, `indonesia`, `thailand`, `vietnam`, `philippines` only as needed                                                       |
| DB migrations       | Add country rule versions, jurisdiction calendars, country-specific statutory profile extensions                                                        |
| Tests               | Country adapter contract tests, rule version activation tests, cross-country legal entity payroll readiness                                             |
| Acceptance criteria | A legal entity in a second country can configure holidays, employee statutory profile, leave rules, and payroll evidence without changing Malaysia code |
| Risks               | Pretending all SEA countries share the same payroll model                                                                                               |
| Guardrails          | Reuse only the rule registry, evidence model, approval model, and payroll snapshot boundary; country logic stays explicit                               |

---

# 9. Afenda-specific architecture rules

## 9.1 DRY

Centralize business rules in services and engines.

Bad:

```txt
Leave balance calculated in page.tsx
Leave balance calculated again in tRPC
Leave balance calculated again in payroll
```

Good:

```txt
LeaveEntitlementEngine.calculate(...)
```

---

## 9.2 KISS

Do not build a universal HR rule DSL in Phase 1.

Use:

```txt
Typed Malaysia rule engines
+ versioned DB rate tables
+ policy evaluation records
```

Only extract a generic abstraction when Singapore/Indonesia/Thailand/Vietnam/Philippines reuse proves it.

---

## 9.3 Server-first App Router

Default:

```txt
Server Component page
→ server service query
→ client table controls only where needed
```

Avoid:

```txt
Client-heavy SPA dashboard
fetching everything through browser-side APIs
```

---

## 9.4 ERP-first product thinking

Every important HR screen should show:

```txt
status
effective date
approval status
evidence
audit trail
period lock impact
downstream finance/accounting impact
```

Not just “edit profile.”

---

## 9.5 Audit-ready evidence

Every decision needs:

```txt
who
what
when
before
after
policy version
approval snapshot
evidence hash
```

---

## 9.6 Policy-bound execution

High-impact actions must pass policy evaluation:

```txt
hire employee
change salary
approve leave
correct attendance
prepare payroll
terminate employee
activate statutory rule version
```

---

## 9.7 Multi-tenant safety

Every query must be scoped by:

```txt
tenant_id
legal_entity_id where relevant
permission scope
RLS policy
```

For HRM, accidental cross-tenant leakage is catastrophic because the data includes salary, identity, tax, attendance, and employment records.

---

## 9.8 Future SEA expansion

Use this expansion strategy:

```txt
Shared:
  employees
  contracts
  leave requests
  attendance
  approvals
  documents
  evidence
  audit
  payroll snapshots

Country-specific:
  statutory profile fields
  contribution engines
  tax engines
  holiday imports
  leave rule engines
  report/export formats
```

---

## 9.9 Vibe-coding-friendly implementation

Keep files obvious and small:

```txt
employee.service.ts
leave.service.ts
attendance.service.ts
payroll-preparation.service.ts
malaysia-epf.engine.ts
malaysia-leave.engine.ts
```

Avoid mysterious abstractions like:

```txt
UniversalHumanCapitalPolicyRuntimeFactoryManager
```

A strong Afenda module should be readable by a senior engineer and editable by a fast-moving builder without breaking governance.

---

# Recommended first implementation priority

Build one vertical slice first:

```txt
Create employee
→ create contract
→ attach document
→ submit approval if required
→ write audit event
→ create evidence pack
→ show employee timeline
```

Then build the second vertical slice:

```txt
Apply leave
→ evaluate Malaysia leave policy
→ create approval
→ approve leave
→ update entitlement
→ write audit
→ show evidence
```

Those two slices prove the HRM architecture: **canonical records, policy-bound execution, approval, evidence, audit, and dense ERP UX**.

[1]: https://nextjs.org/docs/app "Next.js Docs: App Router | Next.js"
[2]: https://trpc.io/docs/client/nextjs/server-actions "Server Actions | tRPC"
[3]: https://nextjs.org/docs/app/api-reference/functions/revalidatePath "Functions: revalidatePath | Next.js"
[4]: https://orm.drizzle.team/docs/transactions "Drizzle ORM - Transactions"
[5]: https://orm.drizzle.team/docs/indexes-constraints "Drizzle ORM - Indexes & Constraints"
[6]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html "PostgreSQL: Documentation: 18: 5.9. Row Security Policies"
[7]: https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution "Employer Mandatory Contribution - KWSP Malaysia"
[8]: https://www.perkeso.gov.my/en/rate-of-contribution.html?utm_source=chatgpt.com "Rate of Contribution"
[9]: https://www.perkeso.gov.my/en/our-services/employer-employee/contributions.html "Contributions"
[10]: https://www.hasil.gov.my/en/employers/mtd-payment/ "MTD Payment | Lembaga Hasil Dalam Negeri Malaysia"
[11]: https://www.hasil.gov.my/en/employers/responsibility-of-employer/ "Responsibility of Employer | Lembaga Hasil Dalam Negeri Malaysia"
[12]: https://www.hasil.gov.my/en/employers/employer-payroll-data-specification/ "Employer (Payroll) - Data Specification | Lembaga Hasil Dalam Negeri Malaysia"
[13]: https://hrdcorp.gov.my/registered-employers "Registered Employers  | HRD Corp"
[14]: https://hrdcorp.gov.my/faq "Employers FAQ  | HRD Corp"
[15]: https://jtksm.mohr.gov.my/sites/default/files/2023-11/Akta%20Kerja%201955%20%28Akta%20265%29.pdf "Act 265_FINAL_as at 1 Jan 2023 (30.3.23).pdf"
