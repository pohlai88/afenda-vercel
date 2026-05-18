# ADR 0017 — Vietnamese e-invoice (NĐ123) substrate

## Status

Accepted (first slice)

## Context

Electronic invoicing in Vietnam (NĐ123 and successor guidance) requires
provider-specific gateways (VNPT, Viettel, FPT, BKAV, …), XML payloads, and
durable transmission state. Afenda does not adopt external microservice buses;
**Server Actions** remain the mutation boundary and **Workflow DevKit** handles
retries for long-running provider round-trips when we add them.

## Decision

1. Introduce module `lib/features/erp-vietnam-einvoice/` with:
   - Drizzle tables `e_invoice` and `e_invoice_transmission` (org-scoped).
   - A **mock** provider implementation for local/dev and contract tests.
   - A minimal **ND123-shaped** XML generator + Zod input validation at the
     action boundary.
2. **Issuance** is Tier A: `issueEInvoiceAction` requires org admin (or stricter
   gate as accounting integration matures) and writes
   `erp.einvoice.invoice.create` **after** successful commit.
3. Real provider credentials stay in Vercel env; the mock provider never calls
   the network.

## Consequences

- UI routes can be added later under `app/[locale]/o/[orgSlug]/apps/…`
  without changing the persistence contract.
- Additional providers extend a narrow interface under
  `data/providers/` — no new architectural folders.

## References

- `lib/features/erp-vietnam-einvoice/`
- Migration `drizzle/0035_erp_vietnam_einvoice.sql`
- `docs/decisions/0016-vietnamese-market-compliance.md`
