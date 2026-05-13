# ADR-0013: Accounting Foundation Pilot After Administration

## Status

Accepted

## Context

After organization administration, the highest-leverage ERP spine is finance.
Viet-ERP confirms accounting as a core enterprise module, but its full ledger,
gateway, and service architecture are not appropriate for Afenda's current
server-first runtime.

## Decision

Pilot accounting as a small foundation slice before ledger posting.

The first implementation sequence is:

1. Chart of accounts master data.
2. Fiscal period controls.
3. Organization tax profile and compliance pack metadata.
4. Audit-visible setup actions.

Full journals, reconciliation, invoice posting, and statutory submission flows
remain out of scope until the foundation tables and authorization rules are
stable.

## Runtime Contract

- Routes live under `/o/{orgSlug}/dashboard/accounting`.
- Reads come from server-only `lib/features/accounting/data/*` queries.
- Mutations are Server Actions under `lib/features/accounting/actions/*`.
- Admin-gated setup writes emit `erp.accounting.*` audit rows only after
  successful commits.
- Page chrome uses `#features/governed-surface`; accounting calculations remain
  in the accounting module.

## Consequences

The accounting surface can move from placeholder to production planning without
introducing microservices, REST CRUD sprawl, or speculative ledger complexity.
