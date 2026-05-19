# ADR-0020 - Portal Boundary for Org-Owned External Surfaces

| Field                  | Value                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**             | Accepted                                                                                                                                                              |
| **Date**               | 2026-05-15                                                                                                                                                            |
| **Supersedes**         | Nothing                                                                                                                                                               |
| **Does not supersede** | ADR-0005 shell unification, ADR-0019 operational scope, `requireOrgSession()` as the internal Workbench tenant guard                                                  |
| **Implements in code** | Governance plus foundation runtime: `.cursor/rules/portal-directory.mdc`, `AGENTS.md`, `lib/portal/`, `components2/portal-shell/`, and `app/[locale]/p/[portalSlug]/` |
| **Related docs**       | `AGENTS.md` sections for Auth/IAM, tenant routing, locale routing, Workbench chrome, and directory contract                                                           |

---

## 1. Context

Afenda already has a canonical internal application boundary:

```txt
/{locale}/o/{orgSlug}
```

That route tree is the authenticated organization Workbench. It is optimized for
ERP operators, admins, managers, and internal users who operate inside an active
organization context with Workbench chrome, ERP RBAC, organization switching,
Nexus, command/search, marketplace access, and audit-ready operational surfaces.

The platform also needs a durable boundary for external-facing and constrained
audiences:

- employees using self-service
- suppliers using supplier collaboration
- customers using customer service or document exchange
- investors using investor reporting
- future portal audiences that are organization-owned but not full Workbench
  operators

Mounting those surfaces under `/o/{orgSlug}` would couple portal users to the
internal Workbench route model and shell. Creating the boundary later would force
URL migration, redirect aliases, duplicate auth resolution, and unclear audit
lineage.

---

## 2. Decision

Create a canonical portal boundary:

```txt
/{locale}/p/{portalSlug}
```

`/p` means portal. It is the org-owned external/constrained surface boundary.
It is not anonymous public runtime. Portal routes are authenticated or
invite-gated, resolve the owning organization through `portalSlug`, and enforce
audience-specific access on the server.

The route responsibilities are:

| Route root                 | Meaning                         | Shell                         | Authority                                        |
| -------------------------- | ------------------------------- | ----------------------------- | ------------------------------------------------ |
| `/{locale}/o/{orgSlug}`    | Internal organization Workbench | `WorkbenchShell` / `AppShell` | `requireOrgSession()` and ERP RBAC               |
| `/{locale}/p/{portalSlug}` | Org-owned portal surface        | `PortalShell`                 | Portal context guard and audience-specific rules |
| `/{locale}/bootstrap`      | Authenticated org bootstrap     | Bootstrap setup shell         | Signed-in session, no active org required        |
| `/{locale}/o`              | Org resolution / picker         | Bootstrap dispatcher          | Signed-in session                                |

`/p` must resolve organization context, but it must not require active Workbench
organization switching. Supplier, customer, investor, and some employee portal
actors may not be normal organization members.

---

## 3. Rejected Alternatives

### 3.1 Use `/t/{portalSlug}`

Rejected. `t` is ambiguous: tenant, team, task, ticket, translation, or token.
The platform already uses `/o` for organization, so `/p` is the clearer compact
route prefix for portals.

### 3.2 Put employee self-service under `/o/{orgSlug}`

Rejected as the long-term portal model. Employee self-service can share HRM
domain logic, but the user experience and route boundary are portal-shaped, not
Workbench-shaped. Building it directly under `/p` avoids later migration when
supplier, customer, or investor portals ship.

### 3.3 Make `/p` public and anonymous

Rejected. Portals are externally reachable but still authenticated,
invite-gated, or otherwise identity-bound. Anonymous marketing/public pages
remain outside the portal boundary.

---

## 4. Consequences

- `/p` needs its own App Router layout, shell, resolver, guards, path helpers,
  tests, and route classification before any portal feature ships.
- `/p/[portalSlug]` layouts and pages must follow the Next.js App Router async
  params contract (`params: Promise<{ portalSlug: string }>` and `await params`).
- `/p` must never mount `WorkbenchShell`.
- Portal chrome belongs in `components2/portal-shell/`.
- Portal control-plane contracts belong in `lib/portal/`.
- ERP business logic still belongs in `lib/features/<module>/`.
- App routes remain wiring only: params, layout composition, and page mounting.
- Server Actions must authorize independently; protected layouts are not enough.
- `route.ts` files are not allowed under `/p`. Portal HTTP contracts must use
  the approved `app/api/*` families and authorize independently.
- `proxy.ts` remains a locale/session cookie presence gate only. Real portal
  authorization belongs in server layouts, Server Components, Server Actions,
  and approved API route handlers.

**App vs source:** Portal routes stay thin in `app/`; chrome in `components2/portal-shell/`. See AGENTS.md §6 *App vs source*.

---

## 5. Definition of Done

This ADR is considered implemented when:

- `AGENTS.md` documents `/p`, `components2/portal-shell/`, and `lib/portal/`.
- `.cursor/rules/portal-directory.mdc` exists and reflects this ADR.
- `/p` runtime work starts with portal context resolution in
  `app/[locale]/p/[portalSlug]/layout.tsx`.
- Portal persistence exists for `organization_portal` and
  `organization_portal_access`.
- No portal route imports or mounts `WorkbenchShell`.
- No portal workflow trusts organization, subject, employee, supplier, customer,
  or investor identity from form data, JSON, query strings, or route params
  without server-side resolution.
