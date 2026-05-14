# ADR-0015 — HRM employment contract compensation (allowances + payroll snapshot)

## Status

Accepted

## Context

Afenda `hrm_employment_contract` stored only base salary. Viet-ERP models named allowances (meal, phone, fuel, performance, KPI), annex metadata, and copies contract compensation into per-period payroll rows so historical runs do not drift when contracts change.

## Decision

1. **Hybrid catalog model** — `hrm_compensation_component` (org-scoped catalog) + `hrm_contract_compensation_line` (one row per contract version per component). Seeded defaults align with Viet-ERP codes (`MEAL_ALLOWANCE`, `PHONE_ALLOWANCE`, `FUEL_ALLOWANCE`, `PERF_ALLOWANCE`, `KPI_AMOUNT`).
2. **Annex slots** — `hrm_employment_contract.annexSlots` JSON (up to three `{ annexNo, annexDate }` pairs), validated with Zod in Server Actions.
3. **Payroll snapshot** — `hrm_payroll_run.compensationSnapshot` JSON array frozen at run creation from the active contract’s lines + component treatments; `getPayrollRunInputSnapshot` prefers the snapshot and falls back to live contract lines for legacy runs with an empty snapshot.
4. **Payroll engine** — `PayrollEngineInput.contractAllowances` emits additional earning lines; gross remuneration includes allowances before statutory passes. Allowance rows carry optional `taxTreatment` / `statutoryBaseTreatment` into line `metadata` for traceability; rule packs may consume them in a later phase.

## Operational guarantees (hardening)

- **Catalog seed** — `ensureDefaultHrmCompensationComponents` is idempotent and runs when creating a **draft contract** and when **preparing payroll runs** for a period, so component rows exist before snapshotting or listing allowances.
- **Snapshot-first** — `getPayrollRunInputSnapshot` uses `hrm_payroll_run.compensationSnapshot` when non-empty; otherwise it falls back to live contract lines for legacy runs.
- **Single pay currency (V1)** — Contract allowances must use the same ISO currency as `basicSalaryCurrency`. Mismatched allowance rows are **skipped** for gross and emit a `PAYROLL_CONTRACT_ALLOWANCE_CURRENCY_MISMATCH` validation issue from `computePayrollRun` (no silent FX). The same rule applies to **approved unpaid claims** (`PAYROLL_CLAIM_CURRENCY_MISMATCH`) and **salary advance repayments** (`PAYROLL_SALARY_ADVANCE_CURRENCY_MISMATCH`). Cross-currency support is explicitly out of scope until FX is defined.
- **Draft pay currency** — Optional `baseSalaryCurrency` on the draft contract form (ISO 4217, 3 letters). When omitted or invalid, the server uses `MYR` (DB default). Allowance line currency follows this pay currency so catalog lines stay aligned with base salary.
- **Draft form amounts** — Non-empty `allowance.<CODE>` values must match the decimal pattern; invalid values fail the Server Action with a translated error (no silent drop).

## Consequences

- New Drizzle tables and migration; `ensureDefaultHrmCompensationComponents` runs on contract draft creation (idempotent).
- `computePayrollRun` digest changes when allowances are present (expected).
- UI: draft contract form gains optional allowance inputs per catalog row.
