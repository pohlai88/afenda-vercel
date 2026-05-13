# ADR-0012: Viet-ERP as Domain Reference, Not Architecture Template

## Status

Accepted

## Context

`nclamvn/Viet-ERP` is a useful public ERP reference because it names the broad
enterprise surface area Afenda will eventually need: accounting, CRM, HRM, MRP,
ecommerce, project management, audit, OpenAPI, metrics, rate limiting, search,
security, and Vietnam-specific compliance.

Its architecture does not match Afenda's runtime contract. Viet-ERP uses a
multi-app Next.js 14 / React 18 monorepo, API-route-first CRUD, Prisma,
Keycloak, Kong, Redis/NATS-heavy microservices, and service-layer vocabulary
that Afenda explicitly bans.

## Decision

Use Viet-ERP only as a domain checklist and sequencing reference.

Borrow these priorities:

- Broad ERP module map.
- Compliance-first accounting and HRM vocabulary.
- Strong audit and operational evidence.
- API/export boundaries for external consumers.
- Rate limiting and abuse controls for expensive actions.
- Observability, health, and production runbooks.
- Documentation that explains module boundaries.

Do not borrow these implementation patterns:

- App-per-module microservices inside this repository.
- Internal dashboard CRUD through REST route handlers.
- Prisma service/repository layers.
- Keycloak/Kong/NATS as default dependencies.
- Generic `services`, `repositories`, `controllers`, `middleware`, or `utils`
  folders.

## Afenda Mapping

| Viet-ERP Concern | Afenda Owner |
| --- | --- |
| Auth and RBAC | `lib/auth/`, Neon Auth, `requireOrgSession`, `canActInOrganization` |
| Audit trail | `iam_audit_event`, `writeIamAuditEvent`, CRUD-SAP + 7W1H primitives |
| API docs / external HTTP | Explicit `app/api/integrations/*` or `app/api/erp/<module>/*` only |
| Event delivery | Org-admin outbound HMAC delivery and Workflow DevKit runs |
| Metrics / tracing | Pino, Sentry, OpenTelemetry, Vercel runtime evidence |
| Rate limiting | Existing Upstash/IAM audit patterns per feature action |
| ERP module shape | `lib/features/<module>/` public barrels and Server Actions |
| Compliance packs | Module-owned Drizzle tables + audit-visible Server Actions |

## Consequences

Post-admin work should deepen Afenda's existing kernels before adding breadth.
The first new domain pilot should be small, auditable, and governed by the App
Router contract rather than a port of a Viet-ERP app.
