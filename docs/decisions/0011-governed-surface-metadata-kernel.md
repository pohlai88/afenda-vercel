# ADR-0011: Governed Surface Metadata Kernel

## Status

Accepted

## Context

Admin, HRM, and operator pages repeat the same production chrome: page headers,
sections, form errors, empty states, and list framing. The Workbench rail already
proved the pattern: a small Zod kernel, pure builders, and thin renderers prevent
drift without turning the product into a low-code framework.

## Decision

Introduce `lib/features/governed-surface/` as the shared kernel for repeated
post-login page chrome.

The kernel owns:

- Page header metadata (including optional **header back** chrome when both
  `backHref` and `backLabel` are supplied — rendered by `GovernedSurface` with
  locale-aware `Link` from `#i18n/navigation`).
- Governed section layout.
- Canonical Server Action result and form-error presentation.
- Governed empty-state, list, action, and audit-panel metadata where the shape is
  repeatable across modules.

The kernel does not own:

- Domain data fetching.
- Business rules.
- Permission decisions.
- Workflow orchestration.
- Arbitrary JSON-to-JSX rendering.

## Layer Contract

```txt
Metadata    -> declarative shape: structure, semantics, intent.
Runtime     -> resolves session, org, permissions, evidence.
Renderer    -> composes approved primitives only.
Domain      -> owns mutations, queries, compliance, and audit.
```

Builders remain pure mappers. Renderers remain React Server Components unless a
specific interaction requires a narrow Client Component. Server Actions continue
to validate input, re-authorize the caller, mutate through module-owned code, and
write `iam_audit_event` rows only after successful commits.

## Consequences

- Repeated admin and ERP chrome can converge without moving tenant truth into UI
  components.
- Future list and audit panel work can build on this kernel incrementally.
- Bespoke surfaces such as Nexus, Orbit, Lynx, and specialized timelines stay
  handcrafted.

## Public Door

Consumers import from `#features/governed-surface` or
`#features/governed-surface/client`. Tests should do the same unless they are
specifically validating a private parser edge case.

## URL state (nuqs) boundary

Org-scoped listing URLs that combine **client-safe** query parsers (`nuqs`
`createLoader` / `createSerializer` under `lib/features/<module>/schemas/`) with
**server-only** normalization (for example IAM filter enums from `#lib/auth`, or
org-feedback inbox state filters from `lib/features/org-feedback/data/`) must
resolve the latter in a `server-only` module under `lib/features/<module>/data/`
and export it from `#features/<module>/server` only — never from the main module
barrel, so Client Components cannot accidentally pull `server-only` graphs.
Examples: `resolveOrgAdminAuditSearchParams` (`#features/org-admin/server`),
`resolveOrgFeedbackInboxSearchParams` (`#features/org-feedback/server`).
