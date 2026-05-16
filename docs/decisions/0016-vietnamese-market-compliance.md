# ADR 0016 — Vietnamese market compliance is core product surface

## Status

Accepted

## Context

Afenda targets multi-tenant ERP workloads. Vietnam-specific payroll, social
insurance (BHXH/BHYT/BHTN), PIT, and statutory filings are **regulatory truth**
surfaces, not optional localization. External reference implementations (e.g.
Viet-ERP ADR-010) treat compliance as a first-class architectural commitment.

Our stack differs (Next.js App Router, Server Actions, Drizzle, Workflow DevKit,
Neon) but the **product decision** is the same: Vietnamese rules live in
versioned rule packs under `lib/features/hrm/data/rule-packs/vietnam/`, are
registered in `hrm_country_rule_pack`, and surface through HRM payroll +
statutory packs — not in ad-hoc route logic.

## Decision

1. **Compliance is not an add-on.** Vietnam payroll line codes, caps, XML
   statutory bodies, and leave-benefit math ship inside the HRM module with
   the same audit and migration discipline as MY/SG packs.
2. **Evidence is schema-backed.** Migrations and Drizzle tables remain the
   source of truth; rule-pack manifests reference TS implementations by
   version tag.
3. **Cross-cutting Vietnamese integrations** (e.g. e-invoice NĐ123) may live in
   dedicated feature modules (`lib/features/erp-vietnam-einvoice/`) but still
   obey org session guards, Tier A audits for issuance, and locale-first routing
   when user-visible surfaces are added.

## Consequences

- New Vietnamese behaviors require: rule-pack or module change, tests, and
  (when schema changes) Drizzle journal–aligned migrations.
- Product and compliance reviews use `docs/modules/hrm-prd.md` and ADRs in
  this folder as the authoritative narrative.

## References

- `lib/features/hrm/data/rule-packs/vietnam/`
- `docs/decisions/0022-viet-erp-domain-reference-map.md`
- `docs/decisions/0017-vietnamese-einvoice-substrate.md`
