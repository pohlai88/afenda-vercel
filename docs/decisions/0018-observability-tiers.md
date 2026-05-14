# ADR 0018 — Observability tiers (Vercel-native)

## Status

Accepted

## Context

Monolithic observability stacks (Prometheus + Grafana + Loki + bespoke infra
alerting) are the wrong **shape** for a Vercel-hosted Next.js app, but the
**intent** — layered signals from request traces through business audits — is
correct.

## Decision

Codify the tiers already described in `AGENTS.md` §5 (Observability) as the
canonical model:

| Tier | Mechanism | Use |
| --- | --- | --- |
| **Technical trace** | OpenTelemetry (`@vercel/otel`, `lib/otel-span.server.ts`) | Latency, workflow enqueue spans, cross-service correlation on Node |
| **Incident** | Sentry (`@sentry/nextjs`) | Uncaught exceptions, release health |
| **Runtime log** | Pino (`#lib/logger.server`) + Vercel Runtime Logs | Structured evidence; expected failures return values — not `error` logs |
| **Business truth** | `iam_audit_event` | Authoritative durable ledger for mutations and Tier A/S events |

**Forbidden:** treating technical logs as a substitute for IAM audit rows on
governed mutations; emitting PII into audit `metadata` (HRM has dedicated ESLint
enforcement).

## Consequences

- New durable workflows enqueue inside OTEL spans (see `#features/execution`).
- Cron and autonomous jobs use `actorUserId: null` only where explicitly
  documented (e.g. statutory aging observations).

## References

- `AGENTS.md` — Observability + IAM audit policy
- `lib/logger.server.ts`
- `lib/otel-span.server.ts`
