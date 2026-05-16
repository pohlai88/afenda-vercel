# Afenda product roadmap

Cross-links **architecture decisions** (`docs/decisions/`) and **module PRDs**
(`docs/modules/`). This file is the single “what’s next” artifact; keep it
short and link out for depth.

## Now (P0)

- **HRM Vietnam depth** — rule packs, statutory XML, leave benefits — see
  [`docs/decisions/0016-vietnamese-market-compliance.md`](decisions/0016-vietnamese-market-compliance.md)
  and [`docs/modules/hrm-prd.md`](modules/hrm-prd.md).
- **Vietnamese e-invoice substrate** — persistence + mock provider + Tier A
  issuance — [`docs/decisions/0017-vietnamese-einvoice-substrate.md`](decisions/0017-vietnamese-einvoice-substrate.md).
- **Typed domain signals** — Zod contracts per module + durable outbox via
  Workflow DevKit (`#features/execution`); first signal: `hrm.payroll.processed`.

## Next (P1)

- Real e-invoice providers (VNPT / Viettel / FPT / …) behind env-gated adapters.
- Accounting journal hooks consuming `org_domain_signal_outbox` (subscriber
  actions validate with the emitting module’s `*.events.ts` / schemas).

## Later (P2)

- **Lynx federated search** — ranked cross-entity lookup (employees, contracts,
  planner, contacts) — see implementation in
  `lib/features/lynx/data/federated-search.queries.server.ts`.
- **Observability** narrative frozen in
  [`docs/decisions/0018-observability-tiers.md`](decisions/0018-observability-tiers.md).

## Decision index (partial)

| ADR | Topic |
| --- | --- |
| [0010](decisions/0010-hrm-module-growth-ceiling.md) | HRM growth ceiling |
| [0011](decisions/0011-governed-surface-metadata-kernel.md) | Governed surface |
| [0022](decisions/0022-viet-erp-domain-reference-map.md) | Viet-ERP reference map |
| [0015](decisions/0015-hrm-contract-compensation-allowances.md) | HRM compensation |
| [0016](decisions/0016-vietnamese-market-compliance.md) | Vietnamese compliance core |
| [0017](decisions/0017-vietnamese-einvoice-substrate.md) | E-invoice substrate |
| [0018](decisions/0018-observability-tiers.md) | Observability tiers |

## How to update

1. Bump priority tables when scope changes; do not duplicate PRD prose here.
2. Any new **architectural category** requires `AGENTS.md` first, then this
   file + an ADR.
