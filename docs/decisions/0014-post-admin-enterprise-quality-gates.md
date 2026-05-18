# ADR-0014: Post-Admin Enterprise Quality Gates

## Status

Accepted

## Context

Post-administration work now touches route registries, governed UI metadata, and
the first accounting foundation surface. The verification burden should scale
with that risk without turning every small task into the full pre-merge gate.

## Decision

Each post-admin implementation phase must ship with the narrowest useful tests
for the contract it changes, then pass the standard residue gate.

## Phase Gates

| Phase | Focused Checks |
| --- | --- |
| Admin closeout | Registry contract tests, sanitizer tests, route existence for registered segments |
| Governed surface | Schema unit tests, renderer import boundary, one real consumer |
| Viet-ERP mapping | ADR-only review; no runtime dependency or new package |
| Accounting foundation | Route renders through Workbench, no ledger writes until tables and audit rules exist |
| Production close | `pnpm gate -- <paths>` after each task; `pnpm gate:push` before PR |

## Standing Rules

- No internal dashboard mutation skips Server Actions.
- No Server Action relies on page/layout auth alone.
- No Client Component receives raw database rows or server-only objects.
- No route emits bare locale-less links or redirects.
- No new feature module bypasses `lib/features/<module>/index.ts`.
- No generated or placeholder phase comment remains once the phase ships.
